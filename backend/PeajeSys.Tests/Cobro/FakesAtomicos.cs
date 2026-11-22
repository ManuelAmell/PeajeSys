using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Tests.Cobro;

/// <summary>Fake de IAjustesAtomicos para EF InMemory (no hay SQL crudo): opera sobre las entidades del contexto.</summary>
public sealed class AjustesAtomicosEnMemoria : IAjustesAtomicos
{
    private readonly PeajeSysDbContext _db;
    public AjustesAtomicosEnMemoria(PeajeSysDbContext db) => _db = db;

    public async Task<decimal?> DebitarCuentaAsync(long idCuenta, decimal monto)
    {
        var c = await _db.CuentasTelepeaje.FirstOrDefaultAsync(x => x.IdCuenta == idCuenta);
        if (c == null || c.EstadoCuenta != "ACTIVA" || c.SaldoDisponible < monto) return null;
        c.SaldoDisponible -= monto;
        return c.SaldoDisponible;
    }

    public async Task<decimal> AcreditarCuentaAsync(long idCuenta, decimal monto)
    {
        var c = await _db.CuentasTelepeaje.FirstOrDefaultAsync(x => x.IdCuenta == idCuenta)
            ?? throw new NotFoundException("CUENTA_NO_ENCONTRADA", "Cuenta inexistente.");
        c.SaldoDisponible += monto;
        return c.SaldoDisponible;
    }

    public async Task RestarRecaudoEfectivoAsync(long idTurno, decimal monto)
    {
        var t = await _db.Turnos.FirstAsync(x => x.IdTurno == idTurno);
        t.TotalRecaudadoEfectivo -= monto;
    }
}

public sealed class GeneradorTicketFalso : IGeneradorNumeroTicket
{
    private long _n;
    public Task<long> SiguienteAsync() => Task.FromResult(++_n);
}

public sealed class GeneradorTicketQueFalla : IGeneradorNumeroTicket
{
    public Task<long> SiguienteAsync() => throw new InvalidOperationException("secuencia caida");
}
