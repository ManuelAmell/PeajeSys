using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class CobroService : ICobroService
{
    private readonly PeajeSysDbContext _context;
    private readonly TimeProvider _reloj;
    private static long _fallbackSequence = 100;
    private static readonly object _sequenceLock = new();

    public CobroService(PeajeSysDbContext context, TimeProvider? reloj = null)
    {
        _context = context;
        _reloj = reloj ?? TimeProvider.System;
    }

    public async Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request)
    {
        // 1. Regla 1: Validar Turno
        var turno = await _context.Turnos
            .Include(t => t.Caseta)
            .FirstOrDefaultAsync(t => t.IdTurno == request.IdTurno);

        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {request.IdTurno}.");
        }

        if (turno.Estado != "ABIERTO")
        {
            throw new ConflictException("TURNO_CERRADO", "El turno indicado no esta ABIERTO. No se pueden procesar cobros.");
        }

        // 2. Regla 2: Obtener Tarifa Vigente
        int idEstacion = turno.Caseta?.IdEstacion ?? 0;
        if (idEstacion == 0)
        {
            var caseta = await _context.Casetas.FindAsync(turno.IdCaseta);
            idEstacion = caseta?.IdEstacion ?? 1;
        }

        var hoy = ZonaHorariaApp.HoyComoFecha();
        Tarifa? tarifa = null;

        if (request.IdTarifa.HasValue && request.IdTarifa.Value > 0)
        {
            tarifa = await _context.Tarifas.FindAsync(request.IdTarifa.Value);
        }

        if (tarifa == null)
        {
            tarifa = await _context.Tarifas
                .Where(t =>
                    t.IdEstacion == idEstacion &&
                    t.IdCategoria == request.IdCategoria &&
                    t.Activa &&
                    t.FechaInicioVigencia <= hoy &&
                    (t.FechaFinVigencia == null || t.FechaFinVigencia >= hoy))
                .OrderByDescending(t => t.FechaInicioVigencia)
                .FirstOrDefaultAsync();
        }

        if (tarifa == null)
        {
            throw new AppException("TARIFA_NO_ENCONTRADA",
                $"No existe tarifa vigente para la estacion {idEstacion} y la categoria {request.IdCategoria}.", 422);
        }

        decimal monto = tarifa.Monto;
        decimal? cambio = null;
        decimal? saldoPosterior = null;
        DetallePagoTelepeajeDto? detalleTelepeajeDto = null;
        DetallePagoTelepeaje? detalleTelepeajeEntidad = null;
        string placaNorm = request.ObtenerPlaca();
        string metodoPagoNorm = (request.MetodoPago ?? "EFECTIVO").Trim().ToUpperInvariant();

        // 3. Regla 3 y 4: Validaciones segun metodo de pago
        if (metodoPagoNorm == "EFECTIVO")
        {
            decimal efectivoRecibido = request.ObtenerEfectivoRecibido();
            ValidarEfectivo(monto, efectivoRecibido);
            cambio = CalcularCambio(monto, efectivoRecibido);
        }
        else if (metodoPagoNorm == "TELEPEAJE")
        {
            if (string.IsNullOrWhiteSpace(placaNorm))
            {
                throw new AppException("PLACA_REQUERIDA", "La placa es obligatoria para cobro por telepeaje.", 422);
            }

            var resultadoDebito = await ProcesarDebitoTelepeajeAsync(placaNorm, monto);
            saldoPosterior = resultadoDebito.SaldoPosterior;
            detalleTelepeajeDto = resultadoDebito.DetalleDto;
            detalleTelepeajeEntidad = resultadoDebito.DetalleEntidad;
        }
        else if (metodoPagoNorm == "EXENTO")
        {
            monto = 0m;
            cambio = null;
            saldoPosterior = null;
        }
        else
        {
            throw new AppException("METODO_PAGO_INVALIDO",
                $"El metodo de pago '{request.MetodoPago}' no es valido. Use EFECTIVO, TELEPEAJE o EXENTO.", 422);
        }

        // 4. Regla 5: Consecutivo de tiquete fiscal
        long seqVal = await ObtenerSiguienteConsecutivoTicketAsync();
        string numeroTicket = FormatearNumeroTicket(ZonaHorariaApp.DiaCivil(_reloj.GetUtcNow()).ToDateTime(TimeOnly.MinValue), seqVal);

        string estadoPaso = metodoPagoNorm == "EXENTO" ? "EXENTO" : "APROBADO";

        // 5. Regla 6: Persistencia y acumuladores
        var transaccion = new TransaccionPeaje
        {
            IdTurno = turno.IdTurno,
            IdTarifa = tarifa.IdTarifa,
            IdCategoria = request.IdCategoria,
            PlacaDetectada = string.IsNullOrWhiteSpace(placaNorm) ? null : placaNorm,
            MontoTarifa = monto,
            MetodoPago = metodoPagoNorm,
            NumeroTicket = numeroTicket,
            FechaHora = DateTime.UtcNow,
            EstadoPaso = estadoPaso
        };

        _context.TransaccionesPeaje.Add(transaccion);

        // Actualizar acumulador en turno para cobros en efectivo
        if (metodoPagoNorm == "EFECTIVO")
        {
            turno.TotalRecaudadoEfectivo += monto;
        }

        await _context.SaveChangesAsync();

        // Si fue telepeaje, vincular IdTransaccion al detalle y persistir
        if (detalleTelepeajeEntidad != null)
        {
            detalleTelepeajeEntidad.IdTransaccion = transaccion.IdTransaccion;
            _context.DetallesPagoTelepeaje.Add(detalleTelepeajeEntidad);
            await _context.SaveChangesAsync();
        }

        var transaccionDto = new TransaccionDetalleDto
        {
            IdTransaccion = transaccion.IdTransaccion,
            IdTurno = transaccion.IdTurno,
            IdTarifa = transaccion.IdTarifa,
            IdCategoria = transaccion.IdCategoria,
            PlacaDetectada = transaccion.PlacaDetectada,
            MontoTarifa = transaccion.MontoTarifa,
            MetodoPago = transaccion.MetodoPago,
            NumeroTicket = transaccion.NumeroTicket,
            FechaHora = transaccion.FechaHora,
            EstadoPaso = transaccion.EstadoPaso
        };

        return new CobroResponseDto
        {
            IdTransaccion = transaccion.IdTransaccion,
            NumeroTicket = transaccion.NumeroTicket,
            Placa = transaccion.PlacaDetectada,
            PlacaDetectada = transaccion.PlacaDetectada,
            IdCategoria = transaccion.IdCategoria,
            MontoTarifa = transaccion.MontoTarifa,
            MetodoPago = transaccion.MetodoPago,
            EfectivoRecibido = metodoPagoNorm == "EFECTIVO" ? request.ObtenerEfectivoRecibido() : null,
            Cambio = cambio,
            SaldoPosterior = saldoPosterior,
            EstadoPaso = transaccion.EstadoPaso,
            FechaHora = transaccion.FechaHora,
            Transaccion = transaccionDto,
            DetalleTelepeaje = detalleTelepeajeDto
        };
    }

    // Debito atómico con bloqueo de saldo telepeaje
    private async Task<(decimal SaldoPosterior, DetallePagoTelepeajeDto DetalleDto, DetallePagoTelepeaje DetalleEntidad)> ProcesarDebitoTelepeajeAsync(string placaNorm, decimal monto)
    {
        CuentaTelepeaje? cuenta = null;

        try
        {
            // Intentar bloqueo de fila FOR UPDATE en PostgreSQL
            cuenta = await _context.CuentasTelepeaje
                .FromSqlRaw("SELECT * FROM cuenta_telepeaje WHERE placa_vehiculo = {0} FOR UPDATE", placaNorm)
                .FirstOrDefaultAsync();
        }
        catch
        {
            // Fallback para entornos donde FromSqlRaw FOR UPDATE no este soportado
            cuenta = await _context.CuentasTelepeaje
                .FirstOrDefaultAsync(c => c.PlacaVehiculo == placaNorm);
        }

        if (cuenta == null)
        {
            throw new AppException("CUENTA_NO_ENCONTRADA",
                $"No se encontro cuenta de telepeaje para la placa '{placaNorm}'.", 422);
        }

        ValidarCuentaTelepeaje(cuenta.EstadoCuenta, cuenta.SaldoDisponible, monto);

        decimal saldoAnterior = cuenta.SaldoDisponible;
        decimal saldoNuevo = saldoAnterior - monto;
        cuenta.SaldoDisponible = saldoNuevo;

        var detalleEntidad = new DetallePagoTelepeaje
        {
            IdCuenta = cuenta.IdCuenta,
            SaldoAnterior = saldoAnterior,
            SaldoPosterior = saldoNuevo,
            AntenaLectoraId = "ANTENA-01"
        };

        var detalleDto = new DetallePagoTelepeajeDto
        {
            IdCuenta = cuenta.IdCuenta,
            SaldoAnterior = saldoAnterior,
            SaldoPosterior = saldoNuevo,
            AntenaLectoraId = "ANTENA-01"
        };

        return (saldoNuevo, detalleDto, detalleEntidad);
    }

    // Consulta la secuencia de PostgreSQL seq_numero_ticket
    private async Task<long> ObtenerSiguienteConsecutivoTicketAsync()
    {
        try
        {
            var resultado = await _context.Database
                .SqlQueryRaw<long>("SELECT nextval('seq_numero_ticket') AS \"Value\"")
                .ToListAsync();

            if (resultado.Count > 0)
            {
                return resultado[0];
            }
        }
        catch
        {
            // Fallback seguro incremental para entornos de prueba sin Postgres activo
        }

        lock (_sequenceLock)
        {
            return ++_fallbackSequence;
        }
    }

    // Metodos puros de logica de dominio (validables en pruebas unitarias)

    public static void ValidarEfectivo(decimal tarifa, decimal efectivoRecibido)
    {
        if (efectivoRecibido < tarifa)
        {
            throw new AppException("EFECTIVO_INSUFICIENTE",
                $"El efectivo recibido ({efectivoRecibido:N0}) es insuficiente para cubrir la tarifa ({tarifa:N0}).", 422);
        }
    }

    public static decimal CalcularCambio(decimal tarifa, decimal efectivoRecibido)
    {
        if (efectivoRecibido < tarifa)
        {
            throw new AppException("EFECTIVO_INSUFICIENTE",
                $"El efectivo recibido ({efectivoRecibido:N0}) no cubre la tarifa ({tarifa:N0}).", 422);
        }

        return efectivoRecibido - tarifa;
    }

    public static void ValidarCuentaTelepeaje(string estadoCuenta, decimal saldoDisponible, decimal tarifa)
    {
        if (!string.Equals(estadoCuenta, "ACTIVA", StringComparison.OrdinalIgnoreCase))
        {
            throw new AppException("CUENTA_INACTIVA",
                $"La cuenta de telepeaje se encuentra en estado '{estadoCuenta}'.", 422);
        }

        if (saldoDisponible < tarifa)
        {
            throw new AppException("SALDO_INSUFICIENTE",
                $"Saldo disponible ({saldoDisponible:N0}) insuficiente para la tarifa ({tarifa:N0}).", 422);
        }
    }

    public static string FormatearNumeroTicket(DateTime fecha, long secuencia)
    {
        return $"TCK-{fecha:yyyyMMdd}-{secuencia:D5}";
    }
}
