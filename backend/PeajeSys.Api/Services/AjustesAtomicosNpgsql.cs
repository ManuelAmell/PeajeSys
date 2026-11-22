using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

/// <summary>
/// Implementacion PostgreSQL: cada operacion es un unico UPDATE atomico. Se ejecuta en la transaccion
/// actual del DbContext (si la hay), de modo que el bloqueo de fila dura hasta el commit.
/// </summary>
public class AjustesAtomicosNpgsql : IAjustesAtomicos
{
    private readonly PeajeSysDbContext _context;

    public AjustesAtomicosNpgsql(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<decimal?> DebitarCuentaAsync(long idCuenta, decimal monto)
    {
        var filas = await _context.Database.SqlQuery<decimal>($@"
            UPDATE cuenta_telepeaje
               SET saldo_disponible = saldo_disponible - {monto}
             WHERE id_cuenta = {idCuenta} AND estado_cuenta = 'ACTIVA' AND saldo_disponible >= {monto}
         RETURNING saldo_disponible AS ""Value""").ToListAsync();
        return filas.Count == 0 ? null : filas[0];
    }

    public async Task<decimal> AcreditarCuentaAsync(long idCuenta, decimal monto)
    {
        var filas = await _context.Database.SqlQuery<decimal>($@"
            UPDATE cuenta_telepeaje
               SET saldo_disponible = saldo_disponible + {monto}
             WHERE id_cuenta = {idCuenta}
         RETURNING saldo_disponible AS ""Value""").ToListAsync();
        if (filas.Count == 0)
        {
            throw new NotFoundException("CUENTA_NO_ENCONTRADA", $"No existe la cuenta de telepeaje {idCuenta}.");
        }
        return filas[0];
    }

    public async Task RestarRecaudoEfectivoAsync(long idTurno, decimal monto)
    {
        await _context.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE turno
               SET total_recaudado_efectivo = COALESCE(total_recaudado_efectivo, 0) - {monto}
             WHERE id_turno = {idTurno}");
    }
}

/// <summary>Consecutivo fiscal desde seq_numero_ticket. Si la secuencia falla, la excepcion sube: nunca se inventa un numero.</summary>
public class GeneradorNumeroTicketNpgsql : IGeneradorNumeroTicket
{
    private readonly PeajeSysDbContext _context;

    public GeneradorNumeroTicketNpgsql(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<long> SiguienteAsync()
    {
        var filas = await _context.Database
            .SqlQueryRaw<long>("SELECT nextval('seq_numero_ticket') AS \"Value\"")
            .ToListAsync();
        if (filas.Count == 0)
        {
            throw new System.InvalidOperationException("seq_numero_ticket no devolvio ningun valor.");
        }
        return filas[0];
    }
}
