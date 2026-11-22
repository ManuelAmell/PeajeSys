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

    private readonly IGeneradorNumeroTicket _generadorTicket;
    private readonly IAjustesAtomicos _ajustes;

    public CobroService(PeajeSysDbContext context, IGeneradorNumeroTicket generadorTicket, IAjustesAtomicos ajustes, TimeProvider? reloj = null)
    {
        _context = context;
        _generadorTicket = generadorTicket;
        _ajustes = ajustes;
        _reloj = reloj ?? TimeProvider.System;
    }

    public async Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request, ActorOperacion actor)
    {
        // La estrategia de reintentos de Npgsql exige que la transaccion de usuario corra dentro de ella.
        var estrategia = _context.Database.CreateExecutionStrategy();
        return await estrategia.ExecuteAsync(() => CobrarEnTransaccionAsync(request, actor));
    }

    private async Task<CobroResponseDto> CobrarEnTransaccionAsync(CobroRequestDto request, ActorOperacion actor)
    {
        _context.ChangeTracker.Clear(); // un reintento debe partir de un estado limpio
        bool relacional = _context.Database.IsRelational();
        await using var tx = relacional ? await _context.Database.BeginTransactionAsync() : null;

        // 1. Regla 1: Validar Turno (y que el cobro lo haga su dueno)
        var turno = await _context.Turnos
            .AsNoTracking()
            .Include(t => t.Caseta)
            .FirstOrDefaultAsync(t => t.IdTurno == request.IdTurno);

        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {request.IdTurno}.");
        }

        ExigirDuenoDelTurno(turno, actor);

        if (turno.Estado != "ABIERTO")
        {
            throw new ConflictException("TURNO_CERRADO", "El turno indicado no esta ABIERTO. No se pueden procesar cobros.");
        }

        // 2. Regla 2: Obtener Tarifa Vigente (la tarifa pedida por el cliente debe cumplir el mismo filtro)
        int idEstacion = turno.Caseta?.IdEstacion ?? 0;
        if (idEstacion == 0)
        {
            var caseta = await _context.Casetas.FindAsync(turno.IdCaseta);
            idEstacion = caseta?.IdEstacion ?? 1;
        }

        var hoy = ZonaHorariaApp.HoyComoFecha();
        var aplicables = _context.Tarifas.AsNoTracking()
            .Where(t =>
                t.IdEstacion == idEstacion &&
                t.IdCategoria == request.IdCategoria &&
                t.Activa &&
                t.FechaInicioVigencia <= hoy &&
                (t.FechaFinVigencia == null || t.FechaFinVigencia >= hoy));

        Tarifa? tarifa;
        if (request.IdTarifa.HasValue && request.IdTarifa.Value > 0)
        {
            int idPedida = request.IdTarifa.Value;
            tarifa = await aplicables.FirstOrDefaultAsync(t => t.IdTarifa == idPedida);
            if (tarifa == null)
            {
                throw new AppException("TARIFA_NO_APLICABLE",
                    $"La tarifa {idPedida} no aplica a la estacion {idEstacion}, la categoria {request.IdCategoria} o no esta vigente.", 422);
            }
        }
        else
        {
            tarifa = await aplicables.OrderByDescending(t => t.FechaInicioVigencia).FirstOrDefaultAsync();
        }

        if (tarifa == null)
        {
            throw new AppException("TARIFA_NO_ENCONTRADA",
                $"No existe tarifa vigente para la estacion {idEstacion} y la categoria {request.IdCategoria}.", 422);
        }

        decimal monto = tarifa.Monto;
        decimal? cambio = null;
        decimal? saldoPosterior = null;
        DetallePagoTelepeaje? detalle = null;
        string placaNorm = request.ObtenerPlaca();
        string metodoPagoNorm = (request.MetodoPago ?? "EFECTIVO").Trim().ToUpperInvariant();
        CuentaTelepeaje? cuenta = null;

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

            cuenta = await _context.CuentasTelepeaje.AsNoTracking().FirstOrDefaultAsync(c => c.PlacaVehiculo == placaNorm);
            if (cuenta == null)
            {
                throw new AppException("CUENTA_NO_ENCONTRADA",
                    $"No se encontro cuenta de telepeaje para la placa '{placaNorm}'.", 422);
            }

            // Pre-validacion para dar un mensaje claro; la garantia real es el debito atomico de mas abajo.
            ValidarCuentaTelepeaje(cuenta.EstadoCuenta, cuenta.SaldoDisponible, monto);
        }
        else if (metodoPagoNorm == "EXENTO")
        {
            monto = 0m;
        }
        else
        {
            throw new AppException("METODO_PAGO_INVALIDO",
                $"El metodo de pago '{request.MetodoPago}' no es valido. Use EFECTIVO, TELEPEAJE o EXENTO.", 422);
        }

        // 4. Regla 5: Consecutivo de tiquete fiscal (si la secuencia falla, el cobro falla)
        long seqVal = await _generadorTicket.SiguienteAsync();
        string numeroTicket = FormatearNumeroTicket(ZonaHorariaApp.DiaCivil(_reloj.GetUtcNow()).ToDateTime(TimeOnly.MinValue), seqVal);

        string estadoPaso = metodoPagoNorm == "EXENTO" ? "EXENTO" : "APROBADO";

        // 5. Regla 6: Persistencia. El acumulado de efectivo del turno lo suma el trigger de BD.
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

        if (cuenta != null)
        {
            // Debito atomico: el UPDATE condicional bloquea la fila hasta el commit y evita el doble gasto.
            decimal? saldoNuevo = await _ajustes.DebitarCuentaAsync(cuenta.IdCuenta, monto);
            if (saldoNuevo == null)
            {
                throw new AppException("SALDO_INSUFICIENTE",
                    $"Saldo insuficiente o cuenta no activa para la tarifa ({monto:N0}).", 422);
            }

            saldoPosterior = saldoNuevo;
            detalle = new DetallePagoTelepeaje
            {
                IdCuenta = cuenta.IdCuenta,
                SaldoAnterior = saldoNuevo.Value + monto,
                SaldoPosterior = saldoNuevo.Value,
                AntenaLectoraId = "ANTENA-01",
                Transaccion = transaccion
            };
            _context.DetallesPagoTelepeaje.Add(detalle); // arrastra la transaccion: un solo SaveChanges
        }
        else
        {
            _context.TransaccionesPeaje.Add(transaccion);
        }

        await _context.SaveChangesAsync();
        if (tx != null)
        {
            await tx.CommitAsync();
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
            DetalleTelepeaje = detalle == null ? null : new DetallePagoTelepeajeDto
            {
                IdCuenta = detalle.IdCuenta,
                SaldoAnterior = detalle.SaldoAnterior,
                SaldoPosterior = detalle.SaldoPosterior,
                AntenaLectoraId = detalle.AntenaLectoraId
            }
        };
    }

    // Solo cobra el dueno del turno, sea cual sea su rol: la terminal de cobro es del RECAUDADOR
    // y un supervisor o administrador que cobrara en un turno ajeno alteraria su arqueo.
    private static void ExigirDuenoDelTurno(Turno turno, ActorOperacion actor)
    {
        if (turno.IdOperador != actor.IdOperador)
        {
            throw new ForbiddenException("TURNO_AJENO", "Solo el operador dueno del turno puede registrar cobros en el.");
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
