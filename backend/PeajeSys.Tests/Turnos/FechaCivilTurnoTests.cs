using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Turnos;

/// <summary>TURNO.fecha es el dia civil de Bogota (como el recaudo), no el dia UTC.</summary>
public class FechaCivilTurnoTests
{
    private static async Task<(string Fecha, DateTime FechaDb)> Abrir(DateTimeOffset ahoraUtc)
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        using var db = new PeajeSysDbContext(options);
        var servicio = new TurnoService(db, new RelojFalso(ahoraUtc));
        var actor = new ActorOperacion(1, "REC-001", Roles.Recaudador);

        var r = await servicio.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 1, FondoInicialCaja = 0 }, actor);
        return (r.Fecha, db.Turnos.Single().Fecha);
    }

    [Fact]
    public async Task AbrirTurno_A_Las_1943_De_Bogota_Del_Dia21_LaFechaEsElDia21()
    {
        // 2026-11-22 00:43 UTC = 2026-11-21 19:43 Bogota
        var (fecha, enBd) = await Abrir(new DateTimeOffset(2026, 11, 22, 0, 43, 0, TimeSpan.Zero));

        Assert.Equal("2026-11-21", fecha);
        Assert.Equal(new DateTime(2026, 11, 21), enBd.Date);
    }

    [Fact]
    public async Task AbrirTurno_A_Las_0030_De_Bogota_Del_Dia22_LaFechaEsElDia22()
    {
        // 2026-11-22 05:30 UTC = 2026-11-22 00:30 Bogota
        var (fecha, _) = await Abrir(new DateTimeOffset(2026, 11, 22, 5, 30, 0, TimeSpan.Zero));

        Assert.Equal("2026-11-22", fecha);
    }
}
