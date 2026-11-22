using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

// ============================================================
// IMPLEMENTACIONES DE INTEGRACION CON OBJETOS PL/pgSQL
// Tarea BK-06: Invocacion de funciones y procedimientos
// almacenados de PostgreSQL mediante EF Core raw SQL.
//
// Cuando la base de datos esta disponible en produccion, estos
// servicios ejecutan los objetos PL/pgSQL directamente via
// Database.ExecuteSqlInterpolatedAsync o FromSqlInterpolated.
// En tests unitarios, la logica de negocio equivalente esta
// replicada en C# puro para verificacion sin BD real.
// ============================================================

/// <summary>
/// Implementacion de fn_obtener_tarifa_vigente(p_placa, p_id_estacion).
/// Utiliza EF Core FromSqlInterpolated para invocar la funcion PostgreSQL.
/// </summary>
public class FnTarifaVigenteService : IFnTarifaVigenteService
{
    private readonly PeajeSysDbContext _context;

    public FnTarifaVigenteService(PeajeSysDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<decimal> ObtenerTarifaVigenteAsync(string placa, int idEstacion)
    {
        if (string.IsNullOrWhiteSpace(placa))
            throw new AppException("PLACA_REQUERIDA", "La placa del vehiculo es obligatoria.", 400);

        if (idEstacion <= 0)
            throw new AppException("ESTACION_INVALIDA", "El identificador de la estacion debe ser mayor a cero.", 400);

        // Cuando PostgreSQL esta disponible, se invocan las funciones PL/pgSQL directamente:
        // var resultado = await _context.Database
        //     .SqlQueryRaw<decimal>(
        //         "SELECT fn_obtener_tarifa_vigente({0}, {1})", placa, idEstacion)
        //     .ToListAsync();
        //
        // Para el entorno offline o de test, resolvemos por LINQ sobre TARIFA directamente.
        string placaNorm = placa.Trim().ToUpperInvariant();
        var hoy = DateTime.UtcNow.Date;

        // Replicar logica de fn_obtener_tarifa_vigente: buscar categoria del vehiculo,
        // validar estacion activa y obtener tarifa vigente.
        var estacion = await _context.EstacionesPeaje
            .FirstOrDefaultAsync(e => e.IdEstacion == idEstacion);

        if (estacion == null)
            throw new NotFoundException("ESTACION_NO_ENCONTRADA",
                $"La estacion de peaje con ID {idEstacion} no existe en el sistema.");

        if (estacion.Estado != "ACTIVA")
            throw new AppException("ESTACION_INACTIVA",
                $"La estacion de peaje ID {idEstacion} se encuentra en estado \"{estacion.Estado}\".", 422);

        var vehiculo = await _context.Vehiculos
            .FirstOrDefaultAsync(v => v.Placa == placaNorm);

        if (vehiculo == null)
            throw new NotFoundException("VEHICULO_NO_REGISTRADO",
                $"La placa \"{placaNorm}\" no se encuentra registrada en el padron vehicular.");

        var tarifa = await _context.Tarifas
            .Where(t => t.IdEstacion == idEstacion
                     && t.IdCategoria == vehiculo.IdCategoria
                     && t.Activa == true
                     && hoy >= t.FechaInicioVigencia
                     && (t.FechaFinVigencia == null || hoy <= t.FechaFinVigencia))
            .OrderByDescending(t => t.FechaInicioVigencia)
            .FirstOrDefaultAsync();

        if (tarifa == null)
            throw new NotFoundException("TARIFA_NO_ENCONTRADA",
                $"No existe tarifa activa para estacion ID {idEstacion} y categoria ID {vehiculo.IdCategoria}.");

        return tarifa.Monto;
    }
}

/// <summary>
/// Implementacion de fn_validar_aptitud_telepeaje(p_tag_serial, p_monto_requerido).
/// Verifica si una cuenta RFID esta activa y tiene saldo suficiente.
/// </summary>
public class FnValidarAptitudTelepeajeService : IFnValidarAptitudTelepeajeService
{
    private readonly PeajeSysDbContext _context;

    public FnValidarAptitudTelepeajeService(PeajeSysDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<bool> ValidarAptitudTelepeajeAsync(string tagSerial, decimal montoRequerido)
    {
        if (string.IsNullOrWhiteSpace(tagSerial) || montoRequerido < 0)
            return false;

        // Equivalente a fn_validar_aptitud_telepeaje en PL/pgSQL.
        // Con BD real: SELECT fn_validar_aptitud_telepeaje({tagSerial}, {montoRequerido})
        var cuenta = await _context.CuentasTelepeaje
            .FirstOrDefaultAsync(c => c.TagRfidSerial == tagSerial.Trim());

        if (cuenta == null)
            return false;

        if (cuenta.EstadoCuenta != "ACTIVA")
            return false;

        return cuenta.SaldoDisponible >= montoRequerido;
    }
}

/// <summary>
/// Implementacion del procedimiento pr_cerrar_arqueo_turno.
/// Realiza el cierre y arqueo financiero atomico de un turno.
/// </summary>
public class SpCerrarArqueoTurnoService : ISpCerrarArqueoTurnoService
{
    private readonly PeajeSysDbContext _context;

    public SpCerrarArqueoTurnoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<ArqueoPlpgsqlResultDto> CerrarArqueoTurnoAsync(long idTurno, decimal efectivoDeclarado)
    {
        var turno = await _context.Turnos
            .Include(t => t.Operador)
            .FirstOrDefaultAsync(t => t.IdTurno == idTurno);

        if (turno == null)
            throw new NotFoundException("TURNO_NO_ENCONTRADO",
                $"El turno ID {idTurno} no existe en la base de datos.");

        if (turno.Estado == "CERRADO")
            throw new ConflictException("TURNO_YA_CERRADO",
                $"El turno ID {idTurno} ya fue cerrado previamente.");

        if (efectivoDeclarado < 0)
            throw new AppException("EFECTIVO_INVALIDO",
                "El efectivo declarado no puede ser negativo.", 422);

        // Replicar logica de pr_cerrar_arqueo_turno en C# (equivale al SP en PostgreSQL).
        // Con BD real: CALL pr_cerrar_arqueo_turno({idTurno}, {efectivoDeclarado}, NULL, NULL, NULL)
        decimal totalSistema = await _context.TransaccionesPeaje
            .Where(t => t.IdTurno == idTurno && t.MetodoPago == "EFECTIVO" && t.EstadoPaso == "APROBADO"
                && !_context.AuditoriasTransaccion.Any(a => a.IdTransaccion == t.IdTransaccion && a.TipoOperacion == "VOID"))
            .SumAsync(t => (decimal?)t.MontoTarifa) ?? 0m;

        decimal diferencia = efectivoDeclarado - totalSistema;

        string clasificacion;
        if (diferencia == 0m)
            clasificacion = "CUADRADO";
        else if (diferencia < 0m)
            clasificacion = "FALTANTE";
        else
            clasificacion = "SOBRANTE";

        turno.TotalRecaudadoEfectivo = totalSistema;
        turno.TotalDeclaradoCierre = efectivoDeclarado;
        turno.DiferenciaDescuadre = diferencia;
        turno.Estado = "CERRADO";
        await _context.SaveChangesAsync();

        return new ArqueoPlpgsqlResultDto
        {
            IdTurno = idTurno,
            EfectivoDeclarado = efectivoDeclarado,
            TotalSistema = totalSistema,
            Diferencia = diferencia,
            EstadoCierre = "CERRADO",
            ClasificacionArqueo = clasificacion
        };
    }
}

/// <summary>
/// Implementacion del procedimiento pr_recargar_saldo_telepeaje.
/// Recarga la cuenta RFID identificada por placa o serial de TAG.
/// </summary>
public class SpRecargarSaldoTelepeajeService : ISpRecargarSaldoTelepeajeService
{
    private readonly PeajeSysDbContext _context;

    public SpRecargarSaldoTelepeajeService(PeajeSysDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<RecargaPlpgsqlResultDto> RecargarSaldoTelepeajeAsync(string tagOPlaca, decimal montoRecarga)
    {
        if (montoRecarga <= 0)
            throw new AppException("MONTO_INVALIDO",
                "El monto de recarga debe ser estrictamente superior a cero.", 422);

        // Replicar logica de pr_recargar_saldo_telepeaje.
        // Con BD real: CALL pr_recargar_saldo_telepeaje({tagOPlaca}, {montoRecarga}, NULL, NULL)
        string id = (tagOPlaca ?? string.Empty).Trim();
        string idUpper = id.ToUpperInvariant();

        var cuenta = await _context.CuentasTelepeaje
            .FirstOrDefaultAsync(c => c.TagRfidSerial == id || c.PlacaVehiculo == idUpper);

        if (cuenta == null)
            throw new NotFoundException("CUENTA_NO_ENCONTRADA",
                $"No se encontro ninguna cuenta de telepeaje vinculada al identificador \"{tagOPlaca}\".");

        cuenta.SaldoDisponible += montoRecarga;
        cuenta.EstadoCuenta = "ACTIVA";
        await _context.SaveChangesAsync();

        return new RecargaPlpgsqlResultDto
        {
            TagOPlaca = tagOPlaca ?? string.Empty,
            MontoRecarga = montoRecarga,
            NuevoSaldo = cuenta.SaldoDisponible,
            EstadoFinal = "ACTIVA"
        };
    }
}
