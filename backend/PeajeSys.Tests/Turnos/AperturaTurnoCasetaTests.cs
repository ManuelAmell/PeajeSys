using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Turnos;

public class AperturaTurnoCasetaTests
{
    private static readonly ActorOperacion Actor = new(1, "REC-001", Roles.Recaudador);

    private static PeajeSysDbContext CrearDb()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1" });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1, Estado = "OPERATIVA" });
        db.Casetas.Add(new Caseta { IdCaseta = 2, IdEstacion = 1, NumeroCarril = 2, Estado = "CERRADA" });
        db.Casetas.Add(new Caseta { IdCaseta = 3, IdEstacion = 1, NumeroCarril = 3, Estado = "MANTENIMIENTO" });
        db.Operadores.Add(new Operador { IdOperador = 1, CodigoEmpleado = "REC-001", Rol = Roles.Recaudador });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task AbrirTurno_CasetaInexistente_LanzaNotFoundException404CasetaNoEncontrada()
    {
        using var db = CrearDb();
        var servicio = new TurnoService(db);
        var req = new AbrirTurnoRequestDto { IdCaseta = 999, FondoInicialCaja = 10000m, Diurno = true };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => servicio.AbrirTurnoAsync(req, Actor));
        Assert.Equal("CASETA_NO_ENCONTRADA", ex.Codigo);
        Assert.Equal(404, ex.StatusCode);
    }

    [Theory]
    [InlineData(2, "CERRADA")]
    [InlineData(3, "MANTENIMIENTO")]
    public async Task AbrirTurno_CasetaNoOperativa_LanzaConflictException409CasetaNoOperativa(int idCaseta, string estadoEsperado)
    {
        using var db = CrearDb();
        var servicio = new TurnoService(db);
        var req = new AbrirTurnoRequestDto { IdCaseta = idCaseta, FondoInicialCaja = 10000m, Diurno = true };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => servicio.AbrirTurnoAsync(req, Actor));
        Assert.Equal("CASETA_NO_OPERATIVA", ex.Codigo);
        Assert.Equal(409, ex.StatusCode);
        Assert.Contains(estadoEsperado, ex.Message);
    }
}
