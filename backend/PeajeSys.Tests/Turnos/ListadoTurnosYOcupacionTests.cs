using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Api;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Turnos;

/// <summary>Listado de turnos acotado por rol y campo ocupada de las casetas (servicio real con EF InMemory).</summary>
public class ListadoTurnosYOcupacionTests
{
    private static readonly ActorOperacion Rec1 = new(1, "REC-001", Roles.Recaudador);
    private static readonly ActorOperacion Sup = new(3, "SUP-001", Roles.Supervisor);
    private static readonly ActorOperacion Adm = new(4, "ADM-001", Roles.Administrador);

    private static PeajeSysDbContext CrearDb()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);
        db.Operadores.Add(new Operador { IdOperador = 1, CodigoEmpleado = "REC-001", Rol = Roles.Recaudador });
        db.Operadores.Add(new Operador { IdOperador = 2, CodigoEmpleado = "REC-002", Rol = Roles.Recaudador });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1 });
        db.Casetas.Add(new Caseta { IdCaseta = 2, IdEstacion = 1 });
        db.Casetas.Add(new Caseta { IdCaseta = 3, IdEstacion = 1 });
        db.Turnos.Add(new Turno { IdTurno = 10, IdCaseta = 1, IdOperador = 1, FondoInicialCaja = 1000, Estado = "ABIERTO" });
        db.Turnos.Add(new Turno { IdTurno = 11, IdCaseta = 2, IdOperador = 2, FondoInicialCaja = 2000, Estado = "CERRADO" });
        db.Turnos.Add(new Turno { IdTurno = 12, IdCaseta = 3, IdOperador = 2, FondoInicialCaja = 3000, Estado = "ABIERTO" });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Casetas_Ocupada_SoloConTurnoAbierto()
    {
        var servicio = new EstacionCasetaService(CrearDb());

        var casetas = (await servicio.ListarCasetasAsync(null)).ToDictionary(c => c.IdCaseta);

        Assert.True(casetas[1].Ocupada);   // turno abierto
        Assert.False(casetas[2].Ocupada);  // solo turno cerrado
        Assert.True(casetas[3].Ocupada);
    }

    [Fact]
    public async Task Casetas_Ocupada_FalseSinTurnos()
    {
        var db = CrearDb();
        db.Casetas.Add(new Caseta { IdCaseta = 4, IdEstacion = 1 });
        db.SaveChanges();
        var servicio = new EstacionCasetaService(db);

        var casetas = (await servicio.ListarCasetasAsync(null)).ToDictionary(c => c.IdCaseta);
        var porId = await servicio.ObtenerCasetaPorIdAsync(4);

        Assert.False(casetas[4].Ocupada);
        Assert.False(porId.Ocupada);
        Assert.True((await servicio.ObtenerCasetaPorIdAsync(1)).Ocupada);
    }

    [Fact]
    public async Task Listar_Recaudador_SoloVeSusTurnos()
    {
        var servicio = new TurnoService(CrearDb());

        var turnos = (await servicio.ListarTurnosAsync(null, null, null, null, null, Rec1)).ToList();

        Assert.Equal(new long[] { 10 }, turnos.Select(t => t.IdTurno).ToArray());
    }

    [Theory]
    [InlineData("REC-002")]
    [InlineData("2")]
    public async Task Listar_RecaudadorConOperadorAjeno_SigueViendoSoloLosSuyos(string operadorAjeno)
    {
        var servicio = new TurnoService(CrearDb());

        var turnos = (await servicio.ListarTurnosAsync(null, operadorAjeno, "ABIERTO", null, null, Rec1)).ToList();

        Assert.DoesNotContain(turnos, t => t.IdOperador != 1);
        Assert.Equal(new long[] { 10 }, turnos.Select(t => t.IdTurno).ToArray());
    }

    [Fact]
    public async Task Listar_RecaudadorSinTurnoAbiertoPropio_RecibeVacioAunqueOtrosTengan()
    {
        var servicio = new TurnoService(CrearDb());
        var rec2 = new ActorOperacion(2, "REC-002", Roles.Recaudador);

        var turnos = (await servicio.ListarTurnosAsync(null, "REC-001", null, null, null, rec2)).ToList();

        Assert.DoesNotContain(turnos, t => t.IdOperador == 1);
    }

    [Theory]
    [InlineData(Roles.Supervisor)]
    [InlineData(Roles.Administrador)]
    public async Task Listar_SupervisorYAdmin_VenTodos(string rol)
    {
        var servicio = new TurnoService(CrearDb());
        var actor = rol == Roles.Supervisor ? Sup : Adm;

        var todos = (await servicio.ListarTurnosAsync(null, null, null, null, null, actor)).ToList();
        var deRec2 = (await servicio.ListarTurnosAsync(null, "REC-002", null, null, null, actor)).ToList();

        Assert.Equal(3, todos.Count);
        Assert.Equal(2, deRec2.Count);
    }
}

public class ListadoTurnosHttpTests : IClassFixture<PeajeSysApiMemoriaFactory>
{
    private readonly HttpClient _cliente;
    private readonly PeajeSysApiMemoriaFactory _fabrica;

    public ListadoTurnosHttpTests(PeajeSysApiMemoriaFactory fabrica)
    {
        _fabrica = fabrica;
        _cliente = fabrica.CreateClient();
        using var alcance = fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<PeajeSysDbContext>();
        db.Casetas.Add(new Caseta { IdCaseta = 501, IdEstacion = 1 });
        db.Casetas.Add(new Caseta { IdCaseta = 502, IdEstacion = 1 });
        db.Turnos.Add(new Turno { IdCaseta = 501, IdOperador = 51, FondoInicialCaja = 1000, Estado = "ABIERTO" });
        db.Turnos.Add(new Turno { IdCaseta = 502, IdOperador = 52, FondoInicialCaja = 2000, Estado = "CERRADO" });
        db.SaveChanges();
    }

    private async Task<JsonElement> Get(string url, int id, string rol, string codigo)
    {
        var servicio = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        string token = servicio.GenerateToken(new Operador
        {
            IdOperador = id, CodigoEmpleado = codigo, Nombres = "P", Apellidos = "H", Rol = rol, Estado = EstadosOperador.Activo
        });
        var peticion = new HttpRequestMessage(HttpMethod.Get, url);
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var r = await _cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task Turnos_Recaudador_NoVeTurnosAjenosNiConOperadorAjeno()
    {
        var sinFiltro = await Get("/api/turnos?estado=ABIERTO", 52, Roles.Recaudador, "REC-052");
        var conAjeno = await Get("/api/turnos?operador=51", 52, Roles.Recaudador, "REC-052");

        Assert.DoesNotContain(sinFiltro.EnumerateArray(), t => t.GetProperty("id_operador").GetInt32() != 52);
        Assert.DoesNotContain(conAjeno.EnumerateArray(), t => t.GetProperty("id_operador").GetInt32() != 52);
        Assert.DoesNotContain(sinFiltro.EnumerateArray(), t => t.GetProperty("id_operador").GetInt32() == 51);
    }

    [Fact]
    public async Task Turnos_Supervisor_VeTodos()
    {
        var lista = await Get("/api/turnos", 53, Roles.Supervisor, "SUP-053");

        var operadores = lista.EnumerateArray().Select(t => t.GetProperty("id_operador").GetInt32()).ToList();
        Assert.Contains(51, operadores);
        Assert.Contains(52, operadores);
    }

    [Fact]
    public async Task Casetas_ExponeOcupadaAUnRecaudador()
    {
        var lista = await Get("/api/casetas", 52, Roles.Recaudador, "REC-052");

        var porId = lista.EnumerateArray().ToDictionary(c => c.GetProperty("id_caseta").GetInt32());
        Assert.True(porId[501].GetProperty("ocupada").GetBoolean());
        Assert.False(porId[502].GetProperty("ocupada").GetBoolean());
    }
}
