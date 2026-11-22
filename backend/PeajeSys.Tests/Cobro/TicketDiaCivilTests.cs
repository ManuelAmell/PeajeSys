using PeajeSys.Core.Interfaces;
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Data;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Cobro;

/// <summary>El numero de ticket lleva el dia civil de Bogota, no el dia UTC.</summary>
public class TicketDiaCivilTests
{
    private static async Task<(PeajeSysDbContext Db, CobroRequestDto Req)> PrepararAsync()
    {
        var db = new PeajeSysDbContext(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1", Estado = "ACTIVA" });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1, TipoCarril = "MIXTO", Estado = "OPERATIVA" });
        db.Turnos.Add(new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Fecha = DateTime.UtcNow.Date, Diurno = true, FondoInicialCaja = 1000m, Estado = "ABIERTO" });
        db.Tarifas.Add(new Tarifa
        {
            IdTarifa = 1, IdEstacion = 1, IdCategoria = 1, Monto = 15000m, ResolucionLegal = "R",
            FechaInicioVigencia = DateTime.UtcNow.Date.AddDays(-10), Activa = true
        });
        await db.SaveChangesAsync();
        return (db, new CobroRequestDto { IdTurno = 1, IdCategoria = 1, IdTarifa = 1, MetodoPago = "EXENTO" });
    }

    [Fact]
    public async Task Ticket_A_Las_1943_De_Bogota_Del_Dia_21_Lleva_El_Dia_21()
    {
        var (db, req) = await PrepararAsync();
        using var _ = db;
        // 19:43 en Bogota (UTC-5) del 21 = 00:43 UTC del 22
        var reloj = new RelojFalso(new DateTimeOffset(2026, 11, 22, 0, 43, 0, TimeSpan.Zero));

        var respuesta = await new CobroService(db, new GeneradorTicketFalso(), new AjustesAtomicosEnMemoria(db), reloj).ProcesarCobroAsync(req, new ActorOperacion(1, "REC-001", "RECAUDADOR"));

        Assert.Contains("20261121", respuesta.NumeroTicket);
        Assert.DoesNotContain("20261122", respuesta.NumeroTicket);
    }

    [Fact]
    public async Task Ticket_A_Las_0030_De_Bogota_Del_Dia_22_Lleva_El_Dia_22()
    {
        var (db, req) = await PrepararAsync();
        using var _ = db;
        var reloj = new RelojFalso(new DateTimeOffset(2026, 11, 22, 5, 30, 0, TimeSpan.Zero));

        var respuesta = await new CobroService(db, new GeneradorTicketFalso(), new AjustesAtomicosEnMemoria(db), reloj).ProcesarCobroAsync(req, new ActorOperacion(1, "REC-001", "RECAUDADOR"));

        Assert.Contains("20261122", respuesta.NumeroTicket);
    }
}
