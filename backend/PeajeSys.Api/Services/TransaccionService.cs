using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

/// <summary>
/// Listado y anulacion de transacciones. La anulacion NO modifica TRANSACCION_PEAJE (estado_paso no admite
/// ANULADO): deja un VOID en AUDITORIA_TRANSACCION y revierte el dinero en una sola transaccion de BD.
/// </summary>
public class TransaccionService : ITransaccionService
{
    private const int MaxMotivo = 255;
    private readonly PeajeSysDbContext _context;

    private readonly IAjustesAtomicos _ajustes;

    public TransaccionService(PeajeSysDbContext context, IAjustesAtomicos ajustes)
    {
        _context = context;
        _ajustes = ajustes;
    }

    public async Task<IReadOnlyList<TransaccionDetalleDto>> ListarPorTurnoAsync(long idTurno, ActorOperacion actor)
    {
        var turno = await _context.Turnos.AsNoTracking().FirstOrDefaultAsync(t => t.IdTurno == idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }
        ExigirPropiedad(turno, actor);

        // Una sola consulta: la subconsulta EXISTS evita un viaje a la BD por transaccion.
        var filas = await _context.TransaccionesPeaje.AsNoTracking()
            .Where(t => t.IdTurno == idTurno)
            .OrderBy(t => t.FechaHora).ThenBy(t => t.IdTransaccion)
            .Select(t => new
            {
                Transaccion = t,
                Anulada = _context.AuditoriasTransaccion.Any(a => a.IdTransaccion == t.IdTransaccion && a.TipoOperacion == "VOID")
            })
            .ToListAsync();
        return filas.Select(f => ADto(f.Transaccion, f.Anulada)).ToList();
    }

    public async Task<AnulacionTransaccionResponseDto> AnularAsync(long idTransaccion, AnularTransaccionRequestDto request, ActorOperacion actor)
    {
        string motivo = (request.Motivo ?? string.Empty).Trim();
        if (motivo.Length == 0)
        {
            throw new DomainException("MOTIVO_REQUERIDO", "Indica el motivo de la anulacion para la auditoria.",
                new Dictionary<string, string> { ["motivo"] = "El motivo es obligatorio." });
        }
        if (motivo.Length > MaxMotivo)
        {
            throw new DomainException("MOTIVO_DEMASIADO_LARGO", $"El motivo no puede superar {MaxMotivo} caracteres.",
                new Dictionary<string, string> { ["motivo"] = $"Maximo {MaxMotivo} caracteres." });
        }

        // La estrategia de reintentos de Npgsql exige ejecutar la transaccion de usuario dentro de ella.
        var estrategia = _context.Database.CreateExecutionStrategy();
        return await estrategia.ExecuteAsync(() => AnularEnTransaccionAsync(idTransaccion, motivo, actor));
    }

    private async Task<AnulacionTransaccionResponseDto> AnularEnTransaccionAsync(long idTransaccion, string motivo, ActorOperacion actor)
    {
        _context.ChangeTracker.Clear(); // un reintento debe partir de un estado limpio
        bool relacional = _context.Database.IsRelational();
        await using var tx = relacional ? await _context.Database.BeginTransactionAsync() : null;

        if (relacional)
        {
            // Serializa anulaciones concurrentes de la misma transaccion (evita dos VOID y doble reversion).
            await _context.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM transaccion_peaje WHERE id_transaccion = {0} FOR UPDATE", idTransaccion);
        }

        var transaccion = await _context.TransaccionesPeaje.FirstOrDefaultAsync(t => t.IdTransaccion == idTransaccion);
        if (transaccion == null)
        {
            throw new NotFoundException("TRANSACCION_NO_ENCONTRADA", $"Transaccion {idTransaccion} no encontrada.");
        }

        var turno = await _context.Turnos.FirstAsync(t => t.IdTurno == transaccion.IdTurno);
        ExigirPropiedad(turno, actor);

        if (turno.Estado != "ABIERTO")
        {
            throw new ConflictException("TURNO_CERRADO", "El turno de la transaccion esta cerrado: no se puede anular.");
        }

        bool yaAnulada = await _context.AuditoriasTransaccion
            .AnyAsync(a => a.IdTransaccion == idTransaccion && a.TipoOperacion == "VOID");
        if (yaAnulada)
        {
            throw new ConflictException("TRANSACCION_YA_ANULADA", $"La transaccion {idTransaccion} ya fue anulada.");
        }

        // Reversiones atomicas (un UPDATE en BD): no se lee, modifica y escribe el saldo ni el recaudo.
        if (transaccion.MetodoPago == "EFECTIVO" && transaccion.EstadoPaso == "APROBADO")
        {
            await _ajustes.RestarRecaudoEfectivoAsync(turno.IdTurno, transaccion.MontoTarifa);
        }
        else if (transaccion.MetodoPago == "TELEPEAJE")
        {
            var detalle = await _context.DetallesPagoTelepeaje.AsNoTracking().FirstOrDefaultAsync(d => d.IdTransaccion == idTransaccion);
            if (detalle == null)
            {
                // No se registra un VOID que oculte el problema: el dinero debitado no se puede devolver sin saber a que cuenta.
                throw new ConflictException("DETALLE_TELEPEAJE_AUSENTE",
                    $"La transaccion {idTransaccion} es de telepeaje pero no tiene detalle de pago: no se puede devolver el saldo. Reportelo a un administrador.");
            }
            await _ajustes.AcreditarCuentaAsync(detalle.IdCuenta, transaccion.MontoTarifa);
        }

        var auditoria = new AuditoriaTransaccion
        {
            IdTransaccion = idTransaccion,
            TipoOperacion = "VOID",
            UsuarioSistema = actor.CodigoEmpleado,
            FechaHoraEvento = DateTime.UtcNow,
            Motivo = motivo
        };
        _context.AuditoriasTransaccion.Add(auditoria);

        await _context.SaveChangesAsync();
        if (tx != null)
        {
            await tx.CommitAsync();
        }

        return new AnulacionTransaccionResponseDto
        {
            Transaccion = ADto(transaccion, anulada: true),
            Auditoria = new AuditoriaItemDto
            {
                IdAuditoria = auditoria.IdAuditoria,
                IdTransaccion = auditoria.IdTransaccion,
                TipoOperacion = auditoria.TipoOperacion,
                UsuarioSistema = auditoria.UsuarioSistema,
                FechaHoraEvento = auditoria.FechaHoraEvento,
                Motivo = auditoria.Motivo
            }
        };
    }

    // El recaudador solo opera sobre su propio turno; supervisor y administrador sobre cualquiera.
    private static void ExigirPropiedad(Turno turno, ActorOperacion actor)
    {
        if (actor.Rol == Roles.Recaudador && turno.IdOperador != actor.IdOperador)
        {
            throw new ForbiddenException("TURNO_AJENO", "Solo puedes operar sobre transacciones de tu propio turno.");
        }
    }

    private static TransaccionDetalleDto ADto(TransaccionPeaje t, bool anulada) => new()
    {
        IdTransaccion = t.IdTransaccion,
        IdTurno = t.IdTurno,
        IdTarifa = t.IdTarifa,
        IdCategoria = t.IdCategoria,
        PlacaDetectada = t.PlacaDetectada,
        MontoTarifa = t.MontoTarifa,
        MetodoPago = t.MetodoPago,
        NumeroTicket = t.NumeroTicket,
        FechaHora = t.FechaHora,
        EstadoPaso = t.EstadoPaso,
        Anulada = anulada
    };
}
