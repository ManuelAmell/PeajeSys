using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class TurnoService : ITurnoService
{
    private readonly PeajeSysDbContext _context;
    private readonly TimeProvider _reloj;

    public TurnoService(PeajeSysDbContext context, TimeProvider? reloj = null)
    {
        _context = context;
        _reloj = reloj ?? TimeProvider.System;
    }

    public async Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request, ActorOperacion actor)
    {
        if (request.IdCaseta <= 0)
        {
            throw new AppException("CASETA_REQUERIDA", "El identificador de caseta es invalido.", 400);
        }

        if (request.FondoInicialCaja < 0)
        {
            throw new DomainException("ERROR_VALIDACION", "El fondo inicial de caja no puede ser negativo.",
                new Dictionary<string, string> { ["fondo_inicial_caja"] = "Debe ser mayor o igual a 0." });
        }

        // El turno se abre SIEMPRE a nombre de quien hace la peticion: el id_operador del cuerpo se ignora
        // para cualquier rol (evita abrir un turno a nombre de otro operador).
        int idOperador = actor.IdOperador;
        if (idOperador <= 0)
        {
            throw new AppException("OPERADOR_REQUERIDO", "El identificador de operador es invalido.", 400);
        }

        // Regla: caseta existente y operativa
        var caseta = await _context.Casetas.FindAsync(request.IdCaseta);
        if (caseta == null)
        {
            throw new NotFoundException("CASETA_NO_ENCONTRADA", $"No existe una caseta con id {request.IdCaseta}.");
        }

        if (!string.Equals(caseta.Estado, "OPERATIVA", StringComparison.OrdinalIgnoreCase))
        {
            throw new ConflictException("CASETA_NO_OPERATIVA",
                $"La caseta {request.IdCaseta} se encuentra en estado '{caseta.Estado}' y no permite apertura de turnos.");
        }

        // Regla: caseta sin turno ABIERTO
        bool casetaOcupada = await _context.Turnos
            .AnyAsync(t => t.IdCaseta == request.IdCaseta && t.Estado == "ABIERTO");
        if (casetaOcupada)
        {
            throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");
        }

        // Regla: operador sin turno ABIERTO en el sistema
        bool operadorActivo = await _context.Turnos
            .AnyAsync(t => t.IdOperador == idOperador && t.Estado == "ABIERTO");
        if (operadorActivo)
        {
            throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO en el sistema.");
        }

        var turno = new Turno
        {
            IdCaseta = request.IdCaseta,
            IdOperador = idOperador,
            // Dia civil de la aplicacion (Bogota), el mismo con el que /api/recaudo agrupa; no el dia UTC.
            Fecha = ZonaHorariaApp.DiaCivil(_reloj.GetUtcNow()).ToDateTime(TimeOnly.MinValue),
            Diurno = request.Diurno,
            FondoInicialCaja = request.FondoInicialCaja,
            TotalRecaudadoEfectivo = 0,
            Estado = "ABIERTO"
        };

        _context.Turnos.Add(turno);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is PostgresException pgEx && pgEx.SqlState == "23505")
        {
            if (pgEx.ConstraintName == "uq_turno_caseta_abierto")
            {
                throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");
            }
            if (pgEx.ConstraintName == "uq_turno_operador_abierto")
            {
                throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO en el sistema.");
            }
            throw;
        }
        catch (PostgresException pgEx) when (pgEx.SqlState == "23505")
        {
            if (pgEx.ConstraintName == "uq_turno_caseta_abierto")
            {
                throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");
            }
            if (pgEx.ConstraintName == "uq_turno_operador_abierto")
            {
                throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO en el sistema.");
            }
            throw;
        }

        return new AbrirTurnoResponseDto
        {
            IdTurno = turno.IdTurno,
            IdCaseta = turno.IdCaseta,
            IdOperador = turno.IdOperador,
            Fecha = turno.Fecha.ToString("yyyy-MM-dd"),
            Diurno = turno.Diurno,
            FondoInicialCaja = turno.FondoInicialCaja,
            TotalRecaudadoEfectivo = turno.TotalRecaudadoEfectivo,
            Estado = turno.Estado
        };
    }

    public async Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request, ActorOperacion actor)
    {
        var turno = await _context.Turnos.FindAsync(idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }
        ExigirPropiedad(turno, actor);

        if (turno.Estado == "CERRADO")
        {
            throw new ConflictException("TURNO_YA_CERRADO", "El turno ya se encuentra cerrado.");
        }

        if (request.TotalDeclaradoCierre < 0)
        {
            throw new AppException("ERROR_VALIDACION", "El total declarado en el cierre no puede ser negativo.", 422);
        }

        turno.Estado = "CERRADO";
        turno.TotalDeclaradoCierre = request.TotalDeclaradoCierre;
        turno.DiferenciaDescuadre = request.TotalDeclaradoCierre - turno.TotalRecaudadoEfectivo;

        await _context.SaveChangesAsync();

        return MapearTurno(turno);
    }

    public async Task<TurnoDto> ObtenerTurnoAsync(long idTurno, ActorOperacion actor)
    {
        var turno = await _context.Turnos.FindAsync(idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }
        ExigirPropiedad(turno, actor);

        return MapearTurno(turno);
    }

    // El recaudador solo ve sus turnos: el filtro operador= se ignora y se fuerza el id del token.
    public async Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, ActorOperacion actor)
    {
        int? soloOperador = actor.Rol == Roles.Recaudador ? actor.IdOperador : null;
        return await ListarTurnosInternoAsync(idCaseta, soloOperador.HasValue ? null : operador, estado, fecha, idEstacion, soloOperador);
    }

    private async Task<IEnumerable<TurnoDto>> ListarTurnosInternoAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, int? soloIdOperador)
    {
        if (idCaseta.HasValue && idCaseta.Value <= 0)
        {
            throw new AppException("FILTRO_INVALIDO", "El identificador de caseta no es valido.", 400);
        }

        if (idEstacion.HasValue && idEstacion.Value <= 0)
        {
            throw new AppException("FILTRO_INVALIDO", "El identificador de estacion no es valido.", 400);
        }

        DateTime? fechaFiltroDt = null;
        if (!string.IsNullOrWhiteSpace(fecha))
        {
            if (!DateOnly.TryParseExact(fecha.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia) && !DateOnly.TryParse(fecha.Trim(), out dia))
            {
                throw new AppException("FILTRO_INVALIDO", "La fecha proporcionada no es valida. Formato esperado: YYYY-MM-DD.", 400);
            }
            fechaFiltroDt = dia.ToDateTime(TimeOnly.MinValue);
        }

        var query = _context.Turnos
            .Include(t => t.Caseta)
            .Include(t => t.Operador)
            .AsQueryable();

        if (idCaseta.HasValue)
        {
            query = query.Where(t => t.IdCaseta == idCaseta.Value);
        }

        if (idEstacion.HasValue)
        {
            query = query.Where(t => t.Caseta != null && t.Caseta.IdEstacion == idEstacion.Value);
        }

        if (soloIdOperador.HasValue)
        {
            query = query.Where(t => t.IdOperador == soloIdOperador.Value);
        }

        if (!string.IsNullOrWhiteSpace(operador))
        {
            string opTrim = operador.Trim();
            string opUpper = opTrim.ToUpperInvariant();
            if (int.TryParse(opTrim, out int opId))
            {
                query = query.Where(t => t.IdOperador == opId || (t.Operador != null && t.Operador.CodigoEmpleado.ToUpper() == opUpper));
            }
            else
            {
                query = query.Where(t => t.Operador != null && t.Operador.CodigoEmpleado.ToUpper() == opUpper);
            }
        }

        if (fechaFiltroDt.HasValue)
        {
            var f = fechaFiltroDt.Value;
            query = query.Where(t => t.Fecha == f);
        }

        if (!string.IsNullOrWhiteSpace(estado))
        {
            string estadoNorm = estado.Trim().ToUpperInvariant();
            query = query.Where(t => t.Estado == estadoNorm);
        }

        var lista = await query.ToListAsync();
        return lista.Select(MapearTurno);
    }

    // El recaudador solo opera sobre su propio turno; supervisor y administrador sobre cualquiera.
    private static void ExigirPropiedad(Turno turno, ActorOperacion actor)
    {
        if (actor.Rol == Roles.Recaudador && turno.IdOperador != actor.IdOperador)
        {
            throw new ForbiddenException("TURNO_AJENO", "Solo puedes operar sobre tu propio turno.");
        }
    }

    private static TurnoDto MapearTurno(Turno t) => new TurnoDto
    {
        IdTurno = t.IdTurno,
        IdCaseta = t.IdCaseta,
        IdOperador = t.IdOperador,
        Fecha = t.Fecha.ToString("yyyy-MM-dd"),
        Diurno = t.Diurno,
        FondoInicialCaja = t.FondoInicialCaja,
        TotalRecaudadoEfectivo = t.TotalRecaudadoEfectivo,
        TotalDeclaradoCierre = t.TotalDeclaradoCierre,
        DiferenciaDescuadre = t.DiferenciaDescuadre,
        Estado = t.Estado
    };
}

