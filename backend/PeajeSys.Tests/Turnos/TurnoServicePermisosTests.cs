using System;
using System.Linq;
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

/// <summary>Propiedad de turno y validaciones de apertura sobre el servicio real con EF InMemory.</summary>
public class TurnoServicePermisosTests
{
    private static readonly ActorOperacion Rec1 = new(1, "REC-001", Roles.Recaudador);
    private static readonly ActorOperacion Rec2 = new(2, "REC-002", Roles.Recaudador);
    private static readonly ActorOperacion Sup = new(3, "SUP-001", Roles.Supervisor);
    private static readonly ActorOperacion Adm = new(4, "ADM-001", Roles.Administrador);

    private const long TurnoDeRec1 = 10;

    private static (TurnoService servicio, PeajeSysDbContext db) Crear()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1, Estado = "OPERATIVA" });
        db.Casetas.Add(new Caseta { IdCaseta = 2, IdEstacion = 1, Estado = "OPERATIVA" });
        db.Turnos.Add(new Turno { IdTurno = TurnoDeRec1, IdCaseta = 1, IdOperador = 1, FondoInicialCaja = 1000, Estado = "ABIERTO" });
        db.SaveChanges();
        return (new TurnoService(db), db);
    }

    // ---- Abrir turno ----

    [Fact]
    public async Task Abrir_Recaudador_IgnoraIdOperadorDelCuerpoYUsaElDelToken()
    {
        var (svc, db) = Crear();

        var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, IdOperador = 1, FondoInicialCaja = 5000 }, Rec2);

        Assert.Equal(2, r.IdOperador);
        Assert.Equal(2, db.Turnos.Single(t => t.IdTurno == r.IdTurno).IdOperador);
    }

    [Theory]
    [InlineData(Roles.Supervisor)]
    [InlineData(Roles.Administrador)]
    public async Task Abrir_SupervisorOAdministrador_TambienUsaSiempreElDelToken(string rol)
    {
        var (svc, _) = Crear();
        var actor = rol == Roles.Supervisor ? Sup : Adm;

        var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, IdOperador = 2, FondoInicialCaja = 5000 }, actor);

        Assert.Equal(actor.IdOperador, r.IdOperador);
    }

    [Fact]
    public async Task Abrir_SinIdOperadorEnElCuerpo_UsaElDelToken()
    {
        var (svc, _) = Crear();

        var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, FondoInicialCaja = 5000 }, Rec2);

        Assert.Equal(2, r.IdOperador);
    }

    [Fact]
    public async Task Abrir_ConIdOperadorAjenoQueTieneTurno_NoDaConflictoPorElOperadorAjeno()
    {
        // REC-001 ya tiene turno abierto; REC-002 envia id_operador=1: debe abrirse a nombre de REC-002.
        var (svc, _) = Crear();

        var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, IdOperador = 1, FondoInicialCaja = 0 }, Rec2);

        Assert.Equal(2, r.IdOperador);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public async Task Abrir_FondoNegativo_Lanza422ConCampo(double fondo)
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, FondoInicialCaja = (decimal)fondo }, Rec2));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
        Assert.True(ex.Campos.ContainsKey("fondo_inicial_caja"));
        Assert.Equal(1, db.Turnos.Count());
    }

    [Fact]
    public async Task Abrir_FondoCero_EsValido()
    {
        var (svc, _) = Crear();

        var r = await svc.AbrirTurnoAsync(new AbrirTurnoRequestDto { IdCaseta = 2, FondoInicialCaja = 0 }, Rec2);

        Assert.Equal(0, r.FondoInicialCaja);
    }

    // ---- Leer turno ----

    [Fact]
    public async Task Obtener_RecaudadorAjeno_Lanza403TurnoAjeno()
    {
        var (svc, _) = Crear();

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => svc.ObtenerTurnoAsync(TurnoDeRec1, Rec2));

        Assert.Equal(403, ex.StatusCode);
        Assert.Equal("TURNO_AJENO", ex.Codigo);
    }

    [Fact]
    public async Task Obtener_RecaudadorPropio_Devuelve()
    {
        var (svc, _) = Crear();

        var t = await svc.ObtenerTurnoAsync(TurnoDeRec1, Rec1);

        Assert.Equal(TurnoDeRec1, t.IdTurno);
    }

    [Theory]
    [InlineData(Roles.Supervisor)]
    [InlineData(Roles.Administrador)]
    public async Task Obtener_SupervisorYAdministrador_VenCualquiera(string rol)
    {
        var (svc, _) = Crear();

        var t = await svc.ObtenerTurnoAsync(TurnoDeRec1, rol == Roles.Supervisor ? Sup : Adm);

        Assert.Equal(TurnoDeRec1, t.IdTurno);
    }

    [Fact]
    public async Task Obtener_Inexistente_Da404AntesQueLaPropiedad()
    {
        var (svc, _) = Crear();

        await Assert.ThrowsAsync<NotFoundException>(() => svc.ObtenerTurnoAsync(999, Rec2));
    }

    // ---- Cerrar turno ----

    [Fact]
    public async Task Cerrar_RecaudadorAjeno_Lanza403YNoCierraElTurno()
    {
        var (svc, db) = Crear();

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            svc.CerrarTurnoAsync(TurnoDeRec1, new CerrarTurnoRequestDto { TotalDeclaradoCierre = 1000 }, Rec2));

        Assert.Equal("TURNO_AJENO", ex.Codigo);
        Assert.Equal("ABIERTO", db.Turnos.Single(t => t.IdTurno == TurnoDeRec1).Estado);
    }

    [Fact]
    public async Task Cerrar_RecaudadorPropio_Cierra()
    {
        var (svc, _) = Crear();

        var t = await svc.CerrarTurnoAsync(TurnoDeRec1, new CerrarTurnoRequestDto { TotalDeclaradoCierre = 1000 }, Rec1);

        Assert.Equal("CERRADO", t.Estado);
    }

    [Fact]
    public async Task Cerrar_Supervisor_CierraTurnoAjeno()
    {
        var (svc, _) = Crear();

        var t = await svc.CerrarTurnoAsync(TurnoDeRec1, new CerrarTurnoRequestDto { TotalDeclaradoCierre = 1000 }, Sup);

        Assert.Equal("CERRADO", t.Estado);
    }
}
