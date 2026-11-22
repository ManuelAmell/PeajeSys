using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

// ============================================================
// 1. SERVICIO DE ARQUEO Y CONCILIACION DE TURNOS
// ============================================================

public class ArqueoService : IArqueoService
{
    private readonly PeajeSysDbContext _context;

    public ArqueoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado)
    {
        var turno = await _context.Turnos.FindAsync(idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }

        // Una transaccion anulada (VOID en auditoria) sigue APROBADA: no cuenta como vehiculo. El efectivo ya
        // viene corregido en turno.total_recaudado_efectivo (la anulacion lo resta).
        long totalVehiculos = await _context.TransaccionesPeaje
            .CountAsync(t => t.IdTurno == idTurno
                && !_context.AuditoriasTransaccion.Any(a => a.IdTransaccion == t.IdTransaccion && a.TipoOperacion == "VOID"));

        var (diferencia, estadoArqueo) = DeterminarArqueo(turno.TotalRecaudadoEfectivo, efectivoReportado);

        return new ArqueoTurnoDto
        {
            IdTurno = turno.IdTurno,
            IdOperador = turno.IdOperador,
            IdCaseta = turno.IdCaseta,
            EfectivoSistema = turno.TotalRecaudadoEfectivo,
            EfectivoReportado = efectivoReportado,
            Diferencia = diferencia,
            EstadoArqueo = estadoArqueo,
            TotalVehiculos = totalVehiculos
        };
    }

    // Metodo puro de logica de dominio de conciliacion estricta
    public static (decimal Diferencia, string EstadoArqueo) DeterminarArqueo(decimal efectivoSistema, decimal efectivoReportado)
    {
        decimal diferencia = efectivoReportado - efectivoSistema;
        string estado;

        if (diferencia == 0)
        {
            estado = "CUADRADO";
        }
        else if (diferencia < 0)
        {
            estado = "FALTANTE";
        }
        else
        {
            estado = "SOBRANTE";
        }

        return (diferencia, estado);
    }
}

// ============================================================
// 2. SERVICIO DE REPORTE CONSOLIDADO DIARIO
// ============================================================

public class ReporteRecaudoService : IReporteRecaudoService
{
    private readonly PeajeSysDbContext _context;

    public ReporteRecaudoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<RecaudoDiarioDto> ObtenerRecaudoDiarioAsync(int? idEstacion, string? fecha)
    {
        // `fecha` es un dia civil de la zona de la aplicacion; las transacciones estan en timestamptz (UTC).
        DateOnly? fechaFiltro = null;
        DateTime inicioUtc = default, finUtc = default;
        if (!string.IsNullOrWhiteSpace(fecha) && DateOnly.TryParse(fecha, out var f))
        {
            fechaFiltro = f;
            (inicioUtc, finUtc) = ZonaHorariaApp.RangoUtcDelDia(f);
        }
        string fechaTexto = (fechaFiltro ?? ZonaHorariaApp.Hoy()).ToString("yyyy-MM-dd");

        // NO se usa la vista vw_resumen_diario_estacion: forma parte de la entrega de base de datos (no se modifica)
        // y es anterior a la anulacion, asi que cuenta las transacciones anuladas (siguen APROBADAS en
        // TRANSACCION_PEAJE; la anulacion solo agrega un VOID en AUDITORIA_TRANSACCION). La API agrega aqui con la
        // misma formula de la vista (por estacion y dia, conteo y suma por metodo de pago) excluyendo las anuladas
        // y agrupando por dia civil de la aplicacion (America/Bogota) en vez del dia UTC de la sesion.
        var transQuery = _context.TransaccionesPeaje.AsNoTracking()
            .Where(t => !_context.AuditoriasTransaccion.Any(a => a.IdTransaccion == t.IdTransaccion && a.TipoOperacion == "VOID"))
            .AsQueryable();

        if (idEstacion.HasValue)
        {
            transQuery = transQuery.Where(t => t.Turno != null && t.Turno.Caseta != null && t.Turno.Caseta.IdEstacion == idEstacion.Value);
        }

        if (fechaFiltro.HasValue)
        {
            transQuery = transQuery.Where(t => t.FechaHora >= inicioUtc && t.FechaHora < finUtc);
        }

        var filas = await transQuery
            .Select(t => new
            {
                IdEstacion = t.Turno!.Caseta!.IdEstacion,
                Estacion = t.Turno!.Caseta!.Estacion!.Nombre,
                IdCaseta = t.Turno!.Caseta!.IdCaseta,
                t.Turno!.Caseta!.NumeroCarril,
                t.Turno!.Caseta!.TipoCarril,
                t.FechaHora,
                t.MetodoPago,
                t.MontoTarifa
            })
            .ToListAsync();

        long totalVeh = filas.Count;
        decimal totalEf = filas.Where(t => t.MetodoPago == "EFECTIVO").Sum(t => t.MontoTarifa);
        decimal totalTag = filas.Where(t => t.MetodoPago == "TELEPEAJE").Sum(t => t.MontoTarifa);
        decimal totalGen = filas.Sum(t => t.MontoTarifa);

        // Desglose por caseta/carril con los mismos filtros (estacion, dia civil) y sin anuladas.
        var carriles = filas
            .GroupBy(t => (t.IdEstacion, t.IdCaseta, t.NumeroCarril, t.TipoCarril))
            .OrderBy(g => g.Key.IdEstacion).ThenBy(g => g.Key.NumeroCarril).ThenBy(g => g.Key.IdCaseta)
            .Select(g => new RecaudoCarrilItemDto
            {
                IdCaseta = g.Key.IdCaseta,
                NumeroCarril = g.Key.NumeroCarril,
                TipoCarril = g.Key.TipoCarril,
                Veh = g.LongCount(),
                Ef = g.Where(t => t.MetodoPago == "EFECTIVO").Sum(t => t.MontoTarifa),
                Tag = g.Where(t => t.MetodoPago == "TELEPEAJE").Sum(t => t.MontoTarifa),
                Total = g.Sum(t => t.MontoTarifa)
            }).ToList();

        // Sin filtro de fecha: una fila por estacion y dia civil (como la vista); con fecha: una sola fila del dia.
        if (!fechaFiltro.HasValue && filas.Count > 0)
        {
            var grupos = filas
                .GroupBy(t => (t.IdEstacion, t.Estacion, Dia: ZonaHorariaApp.DiaCivil(t.FechaHora)))
                .OrderBy(g => g.Key.Dia).ThenBy(g => g.Key.Estacion, StringComparer.Ordinal)
                .ToList();
            var diasPorEstacion = grupos
                .Select(g => new RecaudoDiaItemDto
                {
                    Fecha = g.Key.Dia.ToString("yyyy-MM-dd"),
                    Veh = g.LongCount(),
                    Ef = g.Where(t => t.MetodoPago == "EFECTIVO").Sum(t => t.MontoTarifa),
                    Tag = g.Where(t => t.MetodoPago == "TELEPEAJE").Sum(t => t.MontoTarifa),
                    Total = g.Sum(t => t.MontoTarifa)
                }).ToList();

            return new RecaudoDiarioDto
            {
                IdEstacion = idEstacion,
                Estacion = grupos[0].Key.Estacion,
                Fecha = fechaTexto,
                TotalVehiculos = totalVeh,
                TotalEfectivo = totalEf,
                TotalTelepeaje = totalTag,
                TotalGeneral = totalGen,
                Dias = diasPorEstacion,
                Carriles = carriles
            };
        }

        string? estacionNombre = null;
        if (idEstacion.HasValue)
        {
            var estacion = await _context.EstacionesPeaje.FindAsync(idEstacion.Value);
            estacionNombre = estacion?.Nombre;
        }

        var diasFallback = new List<RecaudoDiaItemDto>
        {
            new()
            {
                Fecha = fechaTexto,
                Veh = totalVeh,
                Ef = totalEf,
                Tag = totalTag,
                Total = totalGen
            }
        };

        return new RecaudoDiarioDto
        {
            IdEstacion = idEstacion,
            Estacion = estacionNombre,
            Fecha = fechaTexto,
            TotalVehiculos = totalVeh,
            TotalEfectivo = totalEf,
            TotalTelepeaje = totalTag,
            TotalGeneral = totalGen,
            Dias = diasFallback,
            Carriles = carriles
        };
    }
}

// ============================================================
// 3. SERVICIO DE TRAZABILIDAD Y AUDITORIA
// ============================================================

public class AuditoriaService : IAuditoriaService
{
    private readonly PeajeSysDbContext _context;

    public AuditoriaService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin,
        string? tipoOperacion,
        string? usuario,
        int page = 1,
        int limit = 50)
    {
        string? fiStr = fechaInicio?.ToString("o");
        string? ffStr = fechaFin?.ToString("o");
        return ListarAuditoriaAsync(null, fiStr, ffStr, tipoOperacion, usuario, page, limit);
    }

    public async Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
        string? fecha,
        string? fechaInicio,
        string? fechaFin,
        string? tipoOperacion,
        string? usuario,
        int page = 1,
        int limit = 50)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 50;
        if (limit > 500) limit = 500;

        DateTime? inicioUtc = null;
        DateTime? finUtc = null;
        bool finExclusivo = false;

        if (!string.IsNullOrWhiteSpace(fecha))
        {
            if (!DateOnly.TryParseExact(fecha.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia) && !DateOnly.TryParse(fecha.Trim(), out dia))
            {
                throw new AppException("FILTRO_INVALIDO", "La fecha proporcionada no es valida. Formato esperado: YYYY-MM-DD.", 400);
            }
            (inicioUtc, finUtc) = ZonaHorariaApp.RangoUtcDelDia(dia);
            finExclusivo = true;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(fechaInicio))
            {
                if (DateOnly.TryParseExact(fechaInicio.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var di))
                {
                    inicioUtc = ZonaHorariaApp.RangoUtcDelDia(di).InicioUtc;
                }
                else if (DateTime.TryParse(fechaInicio.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dtI))
                {
                    inicioUtc = ZonaHorariaApp.AUtc(dtI);
                }
                else
                {
                    throw new AppException("FILTRO_INVALIDO", "La fecha de inicio no es valida.", 400);
                }
            }

            if (!string.IsNullOrWhiteSpace(fechaFin))
            {
                if (DateOnly.TryParseExact(fechaFin.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var df))
                {
                    finUtc = ZonaHorariaApp.RangoUtcDelDia(df).FinUtc;
                    finExclusivo = true;
                }
                else if (DateTime.TryParse(fechaFin.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dtF))
                {
                    finUtc = ZonaHorariaApp.AUtc(dtF);
                    finExclusivo = false;
                }
                else
                {
                    throw new AppException("FILTRO_INVALIDO", "La fecha de fin no es valida.", 400);
                }
            }
        }

        var query = _context.AuditoriasTransaccion.Include(a => a.Transaccion).AsQueryable();

        if (inicioUtc.HasValue)
        {
            query = query.Where(a => a.FechaHoraEvento >= inicioUtc.Value);
        }

        if (finUtc.HasValue)
        {
            if (finExclusivo)
            {
                query = query.Where(a => a.FechaHoraEvento < finUtc.Value);
            }
            else
            {
                query = query.Where(a => a.FechaHoraEvento <= finUtc.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(tipoOperacion))
        {
            string tipoNorm = tipoOperacion.Trim().ToUpperInvariant();
            query = query.Where(a => a.TipoOperacion == tipoNorm);
        }

        if (!string.IsNullOrWhiteSpace(usuario))
        {
            string usuarioNorm = usuario.Trim().ToUpperInvariant();
            query = query.Where(a => a.UsuarioSistema.ToUpper().Contains(usuarioNorm));
        }

        // Orden cronologico descendente
        query = query.OrderByDescending(a => a.FechaHoraEvento);

        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return items.Select(a => new AuditoriaItemDto
        {
            IdAuditoria = a.IdAuditoria,
            IdTransaccion = a.IdTransaccion,
            TipoOperacion = a.TipoOperacion,
            UsuarioSistema = a.UsuarioSistema,
            FechaHoraEvento = a.FechaHoraEvento,
            Motivo = a.Motivo,
            PlacaDetectada = a.Transaccion?.PlacaDetectada,
            MetodoPago = a.Transaccion?.MetodoPago
        });
    }
}

// ============================================================
// 4. SERVICIO DE MONITOREO DE TELEPEAJE Y RECARGAS
// ============================================================

/// <summary>
/// Implementacion de consulta directa a la vista de base de datos vw_estado_cuentas_telepeaje.
/// No tiene caida a consultas directas ni silencia excepciones: si la vista falla, el error sube.
/// </summary>
public class VistaCuentasTelepeajeEf : IVistaCuentasTelepeaje
{
    private readonly PeajeSysDbContext _context;

    public VistaCuentasTelepeajeEf(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<EstadoCuentaTelepeaje>> ConsultarAsync(
        string? condicionSaldo,
        string? estado,
        string? q)
    {
        var queryVista = _context.EstadoCuentasTelepeaje.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(condicionSaldo))
        {
            string condNorm = condicionSaldo.Trim().ToUpperInvariant();
            // Normalizar busqueda sin tilde para que coincida con la condicion oficial de la vista ("SALDO CRÍTICO")
            if (condNorm == "SALDO CRITICO") condNorm = "SALDO CRÍTICO";
            queryVista = queryVista.Where(c => c.CondicionSaldo.ToUpper() == condNorm);
        }

        if (!string.IsNullOrWhiteSpace(estado))
        {
            string estNorm = estado.Trim().ToUpperInvariant();
            queryVista = queryVista.Where(c => c.EstadoCuenta.ToUpper() == estNorm);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            string qNorm = q.Trim().ToUpperInvariant();
            queryVista = queryVista.Where(c => c.PlacaVehiculo.ToUpper().Contains(qNorm) || c.TagRfidSerial.ToUpper().Contains(qNorm));
        }

        return await queryVista.ToListAsync();
    }
}

public class TelepeajeMonitoreoService : ITelepeajeMonitoreoService
{
    private readonly PeajeSysDbContext _context;
    private readonly ILogger<TelepeajeMonitoreoService> _logger;
    private readonly IAjustesAtomicos _ajustes;
    private readonly IVistaCuentasTelepeaje _vista;

    public TelepeajeMonitoreoService(
        PeajeSysDbContext context,
        ILogger<TelepeajeMonitoreoService> logger,
        IAjustesAtomicos ajustes,
        IVistaCuentasTelepeaje? vista = null)
    {
        _context = context;
        _ajustes = ajustes;
        _logger = logger;
        _vista = vista ?? new VistaCuentasTelepeajeEf(context);
    }

    public async Task<IEnumerable<MonitoreoCuentaTelepeajeDto>> ListarCuentasMonitoreoAsync(
        string? condicionSaldo,
        string? estado,
        string? q)
    {
        // La vista de base de datos vw_estado_cuentas_telepeaje es la unica fuente de verdad.
        // Si el filtro devuelve 0 registros, se retorna una coleccion vacia valida.
        // Si la vista falla, la excepcion sube directamente (sin catch silencioso).
        var listaVista = await _vista.ConsultarAsync(condicionSaldo, estado, q);

        return listaVista.Select(v => new MonitoreoCuentaTelepeajeDto
        {
            IdCuenta = v.IdCuenta,
            PlacaVehiculo = v.PlacaVehiculo,
            CategoriaVehiculo = v.CategoriaVehiculo,
            TagRfidSerial = v.TagRfidSerial,
            SaldoDisponible = v.SaldoDisponible,
            EstadoCuenta = v.EstadoCuenta,
            CondicionSaldo = v.CondicionSaldo
        });
    }

    public async Task<RecargaTagResponseDto> RecargarCuentaAsync(RecargaTagRequestDto request, string usuarioResponsable)
    {
        decimal monto = request.ObtenerMonto();
        if (monto <= 0)
        {
            throw new AppException("MONTO_INVALIDO", "El monto de la recarga debe ser mayor a cero.", 422);
        }

        string placa = request.ObtenerPlaca();
        string serialTag = request.ObtenerSerialTag();

        CuentaTelepeaje? cuenta = null;

        if (!string.IsNullOrWhiteSpace(placa))
        {
            cuenta = await _context.CuentasTelepeaje
                .FirstOrDefaultAsync(c => c.PlacaVehiculo == placa);
        }

        if (cuenta == null && !string.IsNullOrWhiteSpace(serialTag))
        {
            cuenta = await _context.CuentasTelepeaje
                .FirstOrDefaultAsync(c => c.TagRfidSerial == serialTag);
        }

        if (cuenta == null)
        {
            throw new NotFoundException("CUENTA_NO_ENCONTRADA",
                $"No se encontro ninguna cuenta de telepeaje para la placa '{placa}' o serial '{serialTag}'.");
        }

        // Incremento atomico en BD: una recarga concurrente con un debito no se pisan.
        decimal saldoNuevo = await _ajustes.AcreditarCuentaAsync(cuenta.IdCuenta, monto);
        decimal saldoAnterior = saldoNuevo - monto;

        var ahora = DateTime.UtcNow;

        // AUDITORIA_TRANSACCION exige una transaccion de peaje (id_transaccion NOT NULL): la recarga se registra en el log.
        _logger.LogInformation(
            "RECARGA_TAG usuario={Usuario} entidad=CUENTA_TELEPEAJE id={IdCuenta} placa={Placa} saldo_anterior={SaldoAnterior} saldo_nuevo={SaldoNuevo} monto={Monto}",
            string.IsNullOrWhiteSpace(usuarioResponsable) ? "SUPERVISOR" : usuarioResponsable,
            cuenta.IdCuenta, cuenta.PlacaVehiculo, saldoAnterior, saldoNuevo, monto);

        await _context.SaveChangesAsync(); // no-op con la implementacion SQL; persiste el fake en InMemory

        return new RecargaTagResponseDto
        {
            IdCuenta = cuenta.IdCuenta,
            PlacaVehiculo = cuenta.PlacaVehiculo,
            TagRfidSerial = cuenta.TagRfidSerial,
            SaldoAnterior = saldoAnterior,
            SaldoNuevo = saldoNuevo,
            MontoRecargado = monto,
            FechaHora = ahora,
            Mensaje = $"Recarga exitosa por ${monto:N0} COP. Nuevo saldo: ${saldoNuevo:N0} COP."
        };
    }

    public async Task<CuentaTelepeajeDetalleDto> ObtenerCuentaPorPlacaAsync(string placa)
    {
        string placaNorm = (placa ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", "");

        var cuenta = await _context.CuentasTelepeaje
            .FirstOrDefaultAsync(c => c.PlacaVehiculo == placaNorm);

        if (cuenta == null)
        {
            throw new NotFoundException("CUENTA_NO_ENCONTRADA", $"No existe cuenta de telepeaje asociada a la placa {placaNorm}.");
        }

        return new CuentaTelepeajeDetalleDto
        {
            IdCuenta = cuenta.IdCuenta,
            PlacaVehiculo = cuenta.PlacaVehiculo,
            TagRfidSerial = cuenta.TagRfidSerial,
            SaldoDisponible = cuenta.SaldoDisponible,
            EstadoCuenta = cuenta.EstadoCuenta
        };
    }
}
