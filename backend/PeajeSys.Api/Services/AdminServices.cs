using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

// ============================================================
// 1. SERVICIO DE TARIFAS CON HISTORICO DE VIGENCIA
// ============================================================

public class TarifaService : ITarifaService
{
    private readonly PeajeSysDbContext _context;

    public TarifaService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TarifaDto>> ListarTarifasAsync(int? idEstacion, int? idCategoria, bool? vigente)
    {
        var query = _context.Tarifas
            .Include(t => t.Estacion)
            .Include(t => t.Categoria)
            .AsQueryable();

        if (idEstacion.HasValue)
        {
            query = query.Where(t => t.IdEstacion == idEstacion.Value);
        }

        if (idCategoria.HasValue)
        {
            query = query.Where(t => t.IdCategoria == idCategoria.Value);
        }

        if (vigente.HasValue)
        {
            var now = DateTime.UtcNow.Date;
            if (vigente.Value)
            {
                query = query.Where(t => t.Activa && t.FechaInicioVigencia <= now && (t.FechaFinVigencia == null || t.FechaFinVigencia >= now));
            }
            else
            {
                query = query.Where(t => !t.Activa || (t.FechaFinVigencia != null && t.FechaFinVigencia < now));
            }
        }

        var lista = await query.OrderByDescending(t => t.FechaInicioVigencia).ToListAsync();
        return lista.Select(MapearTarifa);
    }

    public async Task<TarifaDto> ObtenerTarifaVigenteAsync(int idEstacion, int idCategoria)
    {
        var now = DateTime.UtcNow.Date;

        var tarifa = await _context.Tarifas
            .Include(t => t.Estacion)
            .Include(t => t.Categoria)
            .Where(t =>
                t.IdEstacion == idEstacion &&
                t.IdCategoria == idCategoria &&
                t.Activa &&
                t.FechaInicioVigencia <= now &&
                (t.FechaFinVigencia == null || t.FechaFinVigencia >= now))
            .OrderByDescending(t => t.FechaInicioVigencia)
            .FirstOrDefaultAsync();

        if (tarifa == null)
        {
            throw new NotFoundException("TARIFA_NO_ENCONTRADA",
                $"No existe tarifa vigente para la estacion {idEstacion} y la categoria {idCategoria}.");
        }

        return MapearTarifa(tarifa);
    }

    public async Task<TarifaDto> CrearTarifaConVigenciaAsync(CrearTarifaRequestDto request, string usuarioResponsable)
    {
        if (request.Monto <= 0)
        {
            throw new AppException("ERROR_VALIDACION", "El monto de la tarifa debe ser mayor a cero.", 422);
        }

        if (request.IdEstacion <= 0 || request.IdCategoria <= 0)
        {
            throw new AppException("ERROR_VALIDACION", "Estacion y categoria son campos requeridos.", 422);
        }

        var fechaInicio = request.FechaInicioVigencia ?? DateTime.UtcNow;

        // Regla Atomica de Vigencia: Buscar tarifa previa activa para la misma estacion y categoria
        var tarifaPrevia = await _context.Tarifas
            .Where(t => t.IdEstacion == request.IdEstacion && t.IdCategoria == request.IdCategoria && t.Activa)
            .OrderByDescending(t => t.FechaInicioVigencia)
            .FirstOrDefaultAsync();

        var nuevaTarifa = new Tarifa
        {
            IdEstacion = request.IdEstacion,
            IdCategoria = request.IdCategoria,
            Monto = request.Monto,
            ResolucionLegal = request.ResolucionLegal ?? "Res. MinTransporte Vigente",
            FechaInicioVigencia = fechaInicio,
            FechaFinVigencia = null,
            Activa = true
        };

        // Actualizar vigencia previa
        ActualizarVigenciaTarifa(tarifaPrevia, nuevaTarifa);

        _context.Tarifas.Add(nuevaTarifa);

        // Registro de auditoria inmutable
        var auditoria = new AuditoriaTransaccion
        {
            IdTransaccion = null,
            TipoOperacion = "MODIFICACION_TARIFA",
            UsuarioResponsable = string.IsNullOrWhiteSpace(usuarioResponsable) ? "ADMINISTRADOR" : usuarioResponsable,
            FechaHora = DateTime.UtcNow,
            DatosAnteriores = tarifaPrevia != null
                ? JsonSerializer.Serialize(new { id_tarifa = tarifaPrevia.IdTarifa, monto = tarifaPrevia.Monto, fecha_fin = tarifaPrevia.FechaFinVigencia })
                : null,
            DatosNuevos = JsonSerializer.Serialize(new { id_estacion = nuevaTarifa.IdEstacion, id_categoria = nuevaTarifa.IdCategoria, monto = nuevaTarifa.Monto, fecha_inicio = nuevaTarifa.FechaInicioVigencia }),
            MotivoAnulacion = null
        };

        _context.AuditoriasTransaccion.Add(auditoria);
        await _context.SaveChangesAsync();

        return MapearTarifa(nuevaTarifa);
    }

    // Metodo puro de logica de dominio de actualizacion de vigencia
    public static void ActualizarVigenciaTarifa(Tarifa? tarifaAnterior, Tarifa tarifaNueva)
    {
        if (tarifaAnterior != null)
        {
            tarifaAnterior.FechaFinVigencia = tarifaNueva.FechaInicioVigencia;
            if (tarifaNueva.FechaInicioVigencia <= DateTime.UtcNow)
            {
                tarifaAnterior.Activa = false;
            }
        }

        tarifaNueva.FechaFinVigencia = null;
        tarifaNueva.Activa = true;
    }

    private static TarifaDto MapearTarifa(Tarifa t) => new TarifaDto
    {
        IdTarifa = t.IdTarifa,
        IdEstacion = t.IdEstacion,
        EstacionNombre = t.Estacion?.Nombre,
        IdCategoria = t.IdCategoria,
        CategoriaCodigo = t.Categoria?.Codigo,
        Monto = t.Monto,
        ResolucionLegal = t.ResolucionLegal,
        FechaInicioVigencia = t.FechaInicioVigencia,
        FechaFinVigencia = t.FechaFinVigencia,
        Activa = t.Activa
    };
}

// ============================================================
// 2. SERVICIO DE GESTION DE OPERADORES Y PERSONAL
// ============================================================

public class OperadorAdminService : IOperadorAdminService
{
    private readonly PeajeSysDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public OperadorAdminService(PeajeSysDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<IEnumerable<OperadorAdminDto>> ListarOperadoresAsync(string? rol, string? estado, string? q)
    {
        var query = _context.Operadores.AsQueryable();

        if (!string.IsNullOrWhiteSpace(rol))
        {
            string rolNorm = rol.Trim().ToUpperInvariant();
            query = query.Where(o => o.Rol.ToUpper() == rolNorm);
        }

        if (!string.IsNullOrWhiteSpace(estado))
        {
            string estNorm = estado.Trim().ToUpperInvariant();
            query = query.Where(o => o.Estado.ToUpper() == estNorm);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            string qNorm = q.Trim().ToUpperInvariant();
            query = query.Where(o =>
                o.CodigoEmpleado.ToUpper().Contains(qNorm) ||
                o.Nombres.ToUpper().Contains(qNorm) ||
                o.Apellidos.ToUpper().Contains(qNorm) ||
                o.NumeroDocumento.Contains(qNorm));
        }

        var lista = await query.ToListAsync();
        return lista.Select(MapearOperador);
    }

    public async Task<OperadorAdminDto> ObtenerOperadorPorIdAsync(int id)
    {
        var op = await _context.Operadores.FindAsync(id);
        if (op == null)
        {
            throw new NotFoundException("OPERADOR_NO_ENCONTRADO", $"No existe un operador con id {id}.");
        }

        return MapearOperador(op);
    }

    public async Task<OperadorAdminDto> CrearOperadorAsync(CrearOperadorRequestDto request)
    {
        string codigo = request.ObtenerCodigo();
        string documento = request.ObtenerDocumento();

        if (string.IsNullOrWhiteSpace(codigo))
        {
            throw new AppException("ERROR_VALIDACION", "El codigo de empleado es requerido.", 422);
        }

        if (string.IsNullOrWhiteSpace(documento))
        {
            throw new AppException("ERROR_VALIDACION", "El numero de documento es requerido.", 422);
        }

        // Validacion de unicidad de codigo
        bool codigoExiste = await _context.Operadores
            .AnyAsync(o => o.CodigoEmpleado.ToUpper() == codigo);
        if (codigoExiste)
        {
            throw new ConflictException("OPERADOR_DUPLICADO", $"Ya existe un operador con el codigo de empleado '{codigo}'.");
        }

        // Validacion de unicidad de documento
        bool docExiste = await _context.Operadores
            .AnyAsync(o => o.NumeroDocumento == documento);
        if (docExiste)
        {
            throw new ConflictException("OPERADOR_DUPLICADO", $"Ya existe un operador con el numero de documento '{documento}'.");
        }

        string rol = (request.Rol ?? "RECAUDADOR").Trim().ToUpperInvariant();
        string estado = (request.Estado ?? "ACTIVO").Trim().ToUpperInvariant();
        string password = request.ObtenerPassword();
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new AppException("ERROR_VALIDACION", "La contrasena es requerida para crear un operador.", 422);
        }

        string passwordHash = _passwordHasher.HashPassword(password);

        var nuevo = new Operador
        {
            NumeroDocumento = documento,
            Nombres = request.Nombres.Trim(),
            Apellidos = request.Apellidos.Trim(),
            CodigoEmpleado = codigo,
            Rol = rol,
            Estado = estado,
            PasswordHash = passwordHash
        };

        _context.Operadores.Add(nuevo);
        await _context.SaveChangesAsync();

        return MapearOperador(nuevo);
    }

    public async Task<OperadorAdminDto> ActualizarEstadoAsync(int id, string nuevoEstado)
    {
        var op = await _context.Operadores.FindAsync(id);
        if (op == null)
        {
            throw new NotFoundException("OPERADOR_NO_ENCONTRADO", $"No existe un operador con id {id}.");
        }

        string estadoNorm = (nuevoEstado ?? string.Empty).Trim().ToUpperInvariant();
        if (estadoNorm != "ACTIVO" && estadoNorm != "INACTIVO")
        {
            throw new AppException("ESTADO_INVALIDO", "El estado debe ser ACTIVO o INACTIVO.", 422);
        }

        op.Estado = estadoNorm;
        await _context.SaveChangesAsync();

        return MapearOperador(op);
    }

    private static OperadorAdminDto MapearOperador(Operador o) => new OperadorAdminDto
    {
        IdOperador = o.IdOperador,
        NumeroDocumento = o.NumeroDocumento,
        Nombres = o.Nombres,
        Apellidos = o.Apellidos,
        CodigoEmpleado = o.CodigoEmpleado,
        Rol = o.Rol,
        Estado = o.Estado
    };
}

// ============================================================
// 3. SERVICIO DE ESTACIONES Y CASETAS
// ============================================================

public class EstacionCasetaService : IEstacionCasetaService
{
    private readonly PeajeSysDbContext _context;

    public EstacionCasetaService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<EstacionDto>> ListarEstacionesAsync()
    {
        var estaciones = await _context.EstacionesPeaje.ToListAsync();
        return estaciones.Select(e => new EstacionDto
        {
            IdEstacion = e.IdEstacion,
            Nombre = e.Nombre,
            CodigoEstacion = e.CodigoEstacion,
            UbicacionGeografica = e.UbicacionGeografica,
            SentidoVia = e.SentidoVia,
            Estado = e.Estado,
            CreatedAt = e.CreatedAt
        });
    }

    public async Task<EstacionDto> ObtenerEstacionPorIdAsync(int id)
    {
        var e = await _context.EstacionesPeaje.FindAsync(id);
        if (e == null)
        {
            throw new NotFoundException("ESTACION_NO_ENCONTRADA", $"No existe una estacion con id {id}.");
        }

        return new EstacionDto
        {
            IdEstacion = e.IdEstacion,
            Nombre = e.Nombre,
            CodigoEstacion = e.CodigoEstacion,
            UbicacionGeografica = e.UbicacionGeografica,
            SentidoVia = e.SentidoVia,
            Estado = e.Estado,
            CreatedAt = e.CreatedAt
        };
    }

    public async Task<IEnumerable<CasetaDto>> ListarCasetasAsync(int? idEstacion)
    {
        var query = _context.Casetas.Include(c => c.Estacion).AsQueryable();

        if (idEstacion.HasValue)
        {
            query = query.Where(c => c.IdEstacion == idEstacion.Value);
        }

        var lista = await query.ToListAsync();
        return lista.Select(c => new CasetaDto
        {
            IdCaseta = c.IdCaseta,
            IdEstacion = c.IdEstacion,
            EstacionNombre = c.Estacion?.Nombre,
            NumeroCarril = c.NumeroCarril,
            TipoCarril = c.TipoCarril,
            Estado = c.Estado
        });
    }

    public async Task<CasetaDto> ObtenerCasetaPorIdAsync(int id)
    {
        var c = await _context.Casetas.Include(x => x.Estacion).FirstOrDefaultAsync(x => x.IdCaseta == id);
        if (c == null)
        {
            throw new NotFoundException("CASETA_NO_ENCONTRADA", $"No existe una caseta con id {id}.");
        }

        return new CasetaDto
        {
            IdCaseta = c.IdCaseta,
            IdEstacion = c.IdEstacion,
            EstacionNombre = c.Estacion?.Nombre,
            NumeroCarril = c.NumeroCarril,
            TipoCarril = c.TipoCarril,
            Estado = c.Estado
        };
    }

    public async Task<CasetaDto> ActualizarEstadoCasetaAsync(int id, string nuevoEstado)
    {
        var c = await _context.Casetas.Include(x => x.Estacion).FirstOrDefaultAsync(x => x.IdCaseta == id);
        if (c == null)
        {
            throw new NotFoundException("CASETA_NO_ENCONTRADA", $"No existe una caseta con id {id}.");
        }

        string estadoNorm = (nuevoEstado ?? string.Empty).Trim().ToUpperInvariant();
        if (estadoNorm != "OPERATIVA" && estadoNorm != "CERRADA" && estadoNorm != "MANTENIMIENTO")
        {
            throw new AppException("ESTADO_INVALIDO", "Estado invalido. Use OPERATIVA, CERRADA o MANTENIMIENTO.", 422);
        }

        // Regla: si se intenta pasar a MANTENIMIENTO o CERRADA y la caseta tiene un turno abierto, rechazar
        if (estadoNorm == "MANTENIMIENTO" || estadoNorm == "CERRADA")
        {
            bool tieneTurnoAbierto = await _context.Turnos
                .AnyAsync(t => t.IdCaseta == id && t.Estado == "ABIERTO");

            if (tieneTurnoAbierto)
            {
                throw new ConflictException("TURNO_ABIERTO_EN_CASETA",
                    "La caseta tiene un turno actualmente abierto. Debe cerrar el turno antes de cambiar su estado a CERRADA o MANTENIMIENTO.");
            }
        }

        c.Estado = estadoNorm;
        await _context.SaveChangesAsync();

        return new CasetaDto
        {
            IdCaseta = c.IdCaseta,
            IdEstacion = c.IdEstacion,
            EstacionNombre = c.Estacion?.Nombre,
            NumeroCarril = c.NumeroCarril,
            TipoCarril = c.TipoCarril,
            Estado = c.Estado
        };
    }
}

// ============================================================
// 4. SERVICIO DE CATEGORIAS VEHICULARES
// ============================================================

public class CategoriaService : ICategoriaService
{
    private readonly PeajeSysDbContext _context;

    public CategoriaService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CategoriaVehiculoDto>> ListarCategoriasAsync(bool? activo)
    {
        var query = _context.CategoriasVehiculo.AsQueryable();

        if (activo.HasValue)
        {
            query = query.Where(c => c.Activo == activo.Value);
        }

        var lista = await query.ToListAsync();
        return lista.Select(c => new CategoriaVehiculoDto
        {
            IdCategoria = c.IdCategoria,
            Codigo = c.Codigo,
            Descripcion = c.Descripcion,
            NumeroEjesMin = c.NumeroEjesMin,
            NumeroEjesMax = c.NumeroEjesMax,
            PesoMaximoTon = c.PesoMaximoTon,
            Activo = c.Activo
        });
    }

    public async Task<CategoriaVehiculoDto> ObtenerCategoriaPorIdAsync(int id)
    {
        var c = await _context.CategoriasVehiculo.FindAsync(id);
        if (c == null)
        {
            throw new NotFoundException("CATEGORIA_NO_ENCONTRADA", $"No existe una categoria con id {id}.");
        }

        return new CategoriaVehiculoDto
        {
            IdCategoria = c.IdCategoria,
            Codigo = c.Codigo,
            Descripcion = c.Descripcion,
            NumeroEjesMin = c.NumeroEjesMin,
            NumeroEjesMax = c.NumeroEjesMax,
            PesoMaximoTon = c.PesoMaximoTon,
            Activo = c.Activo
        };
    }

    public async Task<CategoriaVehiculoDto> CrearCategoriaAsync(CrearCategoriaRequestDto request)
    {
        if (request.NumeroEjesMax < request.NumeroEjesMin)
        {
            throw new AppException("ERROR_VALIDACION", "El numero maximo de ejes no puede ser menor al minimo.", 422);
        }

        if (request.PesoMaximoTon.HasValue && request.PesoMaximoTon.Value <= 0)
        {
            throw new AppException("ERROR_VALIDACION", "El peso maximo debe ser positivo.", 422);
        }

        var nueva = new CategoriaVehiculo
        {
            Codigo = request.Codigo.Trim().ToUpperInvariant(),
            Descripcion = request.Descripcion.Trim(),
            NumeroEjesMin = request.NumeroEjesMin,
            NumeroEjesMax = request.NumeroEjesMax,
            PesoMaximoTon = request.PesoMaximoTon,
            Activo = request.Activo
        };

        _context.CategoriasVehiculo.Add(nueva);
        await _context.SaveChangesAsync();

        return new CategoriaVehiculoDto
        {
            IdCategoria = nueva.IdCategoria,
            Codigo = nueva.Codigo,
            Descripcion = nueva.Descripcion,
            NumeroEjesMin = nueva.NumeroEjesMin,
            NumeroEjesMax = nueva.NumeroEjesMax,
            PesoMaximoTon = nueva.PesoMaximoTon,
            Activo = nueva.Activo
        };
    }
}
