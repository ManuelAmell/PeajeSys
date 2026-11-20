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

        long totalVehiculos = await _context.TransaccionesPeaje
            .CountAsync(t => t.IdTurno == idTurno);

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
        DateTime? fechaFiltro = null;
        if (!string.IsNullOrWhiteSpace(fecha) && DateTime.TryParse(fecha, out var f))
        {
            fechaFiltro = f.Date;
        }

        // Intento 1: Consultar la vista de base de datos vw_resumen_diario_estacion
        try
        {
            var queryVista = _context.ResumenDiarioEstaciones.AsQueryable();

            if (idEstacion.HasValue)
            {
                queryVista = queryVista.Where(v => v.IdEstacion == idEstacion.Value);
            }

            if (fechaFiltro.HasValue)
            {
                queryVista = queryVista.Where(v => v.Fecha.Date == fechaFiltro.Value);
            }

            var listaVista = await queryVista.ToListAsync();

            if (listaVista.Count > 0)
            {
                long vehTotal = listaVista.Sum(v => v.TotalVehiculos);
                decimal efTotal = listaVista.Sum(v => v.RecaudoEfectivo);
                decimal tagTotal = listaVista.Sum(v => v.RecaudoTelepeaje);
                decimal genTotal = listaVista.Sum(v => v.RecaudoTotal);
                string nombreEstacion = listaVista.First().Estacion;

                var dias = listaVista.Select(v => new RecaudoDiaItemDto
                {
                    Fecha = v.Fecha.ToString("yyyy-MM-dd"),
                    Veh = v.TotalVehiculos,
                    Ef = v.RecaudoEfectivo,
                    Tag = v.RecaudoTelepeaje,
                    Total = v.RecaudoTotal
                }).ToList();

                return new RecaudoDiarioDto
                {
                    IdEstacion = idEstacion,
                    Estacion = nombreEstacion,
                    Fecha = fechaFiltro?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    TotalVehiculos = vehTotal,
                    TotalEfectivo = efTotal,
                    TotalTelepeaje = tagTotal,
                    TotalGeneral = genTotal,
                    Dias = dias
                };
            }
        }
        catch
        {
            // Fallback a agregacion directa si la vista no esta presente en memoria/sqlite
        }

        // Fallback: agregacion directa sobre TRANSACCION_PEAJE
        var transQuery = _context.TransaccionesPeaje
            .Include(t => t.Turno)
            .ThenInclude(tu => tu!.Caseta)
            .ThenInclude(c => c!.Estacion)
            .AsQueryable();

        if (idEstacion.HasValue)
        {
            transQuery = transQuery.Where(t => t.Turno != null && t.Turno.Caseta != null && t.Turno.Caseta.IdEstacion == idEstacion.Value);
        }

        if (fechaFiltro.HasValue)
        {
            transQuery = transQuery.Where(t => t.FechaHora.Date == fechaFiltro.Value);
        }

        var transacciones = await transQuery.ToListAsync();

        long totalVeh = transacciones.Count;
        decimal totalEf = transacciones.Where(t => t.MetodoPago == "EFECTIVO").Sum(t => t.MontoTarifa);
        decimal totalTag = transacciones.Where(t => t.MetodoPago == "TELEPEAJE").Sum(t => t.MontoTarifa);
        decimal totalGen = transacciones.Sum(t => t.MontoTarifa);

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
                Fecha = fechaFiltro?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
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
            Fecha = fechaFiltro?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            TotalVehiculos = totalVeh,
            TotalEfectivo = totalEf,
            TotalTelepeaje = totalTag,
            TotalGeneral = totalGen,
            Dias = diasFallback
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

    public async Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin,
        string? tipoOperacion,
        string? usuario,
        int page = 1,
        int limit = 50)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 50;
        if (limit > 500) limit = 500;

        var query = _context.AuditoriasTransaccion.AsQueryable();

        if (fechaInicio.HasValue)
        {
            query = query.Where(a => a.FechaHora >= fechaInicio.Value);
        }

        if (fechaFin.HasValue)
        {
            query = query.Where(a => a.FechaHora <= fechaFin.Value);
        }

        if (!string.IsNullOrWhiteSpace(tipoOperacion))
        {
            string tipoNorm = tipoOperacion.Trim().ToUpperInvariant();
            query = query.Where(a => a.TipoOperacion == tipoNorm);
        }

        if (!string.IsNullOrWhiteSpace(usuario))
        {
            string usuarioNorm = usuario.Trim().ToUpperInvariant();
            query = query.Where(a => a.UsuarioResponsable.ToUpper().Contains(usuarioNorm));
        }

        // Orden cronologico descendente
        query = query.OrderByDescending(a => a.FechaHora);

        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return items.Select(a => new AuditoriaItemDto
        {
            IdAuditoria = a.IdAuditoria,
            IdTransaccion = a.IdTransaccion,
            TipoOperacion = a.TipoOperacion,
            UsuarioResponsable = a.UsuarioResponsable,
            FechaHora = a.FechaHora,
            DatosAnteriores = a.DatosAnteriores,
            DatosNuevos = a.DatosNuevos,
            MotivoAnulacion = a.MotivoAnulacion
        });
    }
}

// ============================================================
// 4. SERVICIO DE MONITOREO DE TELEPEAJE Y RECARGAS
// ============================================================

public class TelepeajeMonitoreoService : ITelepeajeMonitoreoService
{
    private readonly PeajeSysDbContext _context;

    public TelepeajeMonitoreoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MonitoreoCuentaTelepeajeDto>> ListarCuentasMonitoreoAsync(
        string? condicionSaldo,
        string? estado,
        string? q)
    {
        // Intento 1: consultar la vista vw_estado_cuentas_telepeaje
        try
        {
            var queryVista = _context.EstadoCuentasTelepeaje.AsQueryable();

            if (!string.IsNullOrWhiteSpace(condicionSaldo))
            {
                string condNorm = condicionSaldo.Trim().ToUpperInvariant();
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

            var listaVista = await queryVista.ToListAsync();

            if (listaVista.Count > 0)
            {
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
        }
        catch
        {
            // Fallback a consulta directa sobre CUENTA_TELEPEAJE
        }

        // Fallback: consulta directa con calculo de condicion de saldo
        var query = _context.CuentasTelepeaje
            .Include(c => c.Vehiculo)
            .ThenInclude(v => v!.Categoria)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(estado))
        {
            string estNorm = estado.Trim().ToUpperInvariant();
            query = query.Where(c => c.EstadoCuenta.ToUpper() == estNorm);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            string qNorm = q.Trim().ToUpperInvariant();
            query = query.Where(c => c.PlacaVehiculo.ToUpper().Contains(qNorm) || c.TagRfidSerial.ToUpper().Contains(qNorm));
        }

        var cuentas = await query.ToListAsync();

        var resultado = cuentas.Select(c =>
        {
            string condicion = c.SaldoDisponible == 0
                ? "SIN SALDO"
                : c.SaldoDisponible < 20000
                    ? "SALDO CRITICO"
                    : "SALDO SUFICIENTE";

            return new MonitoreoCuentaTelepeajeDto
            {
                IdCuenta = c.IdCuenta,
                PlacaVehiculo = c.PlacaVehiculo,
                CategoriaVehiculo = c.Vehiculo?.Categoria?.Codigo ?? "CAT_I",
                TagRfidSerial = c.TagRfidSerial,
                SaldoDisponible = c.SaldoDisponible,
                EstadoCuenta = c.EstadoCuenta,
                CondicionSaldo = condicion
            };
        });

        if (!string.IsNullOrWhiteSpace(condicionSaldo))
        {
            string condNorm = condicionSaldo.Trim().ToUpperInvariant();
            resultado = resultado.Where(c => c.CondicionSaldo.ToUpper() == condNorm);
        }

        return resultado;
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

        decimal saldoAnterior = cuenta.SaldoDisponible;
        decimal saldoNuevo = saldoAnterior + monto;
        cuenta.SaldoDisponible = saldoNuevo;

        var ahora = DateTime.UtcNow;

        // Registrar evento en AUDITORIA_TRANSACCION
        var auditoria = new AuditoriaTransaccion
        {
            IdTransaccion = null,
            TipoOperacion = "RECARGA_TAG",
            UsuarioResponsable = string.IsNullOrWhiteSpace(usuarioResponsable) ? "SUPERVISOR" : usuarioResponsable,
            FechaHora = ahora,
            DatosAnteriores = JsonSerializer.Serialize(new { saldo_disponible = saldoAnterior }),
            DatosNuevos = JsonSerializer.Serialize(new { saldo_disponible = saldoNuevo, monto_recargado = monto }),
            MotivoAnulacion = null
        };

        _context.AuditoriasTransaccion.Add(auditoria);
        await _context.SaveChangesAsync();

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
}
