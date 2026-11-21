using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Api;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Turnos;

/// <summary>Fabrica con EF InMemory en lugar de PostgreSQL para ejercitar los endpoints de turnos de punta a punta.</summary>
public sealed class PeajeSysApiMemoriaFactory : PeajeSysApiFactory
{
    private readonly string _nombreBd = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            var existentes = services.Where(d => d.ServiceType == typeof(DbContextOptions<PeajeSysDbContext>)).ToList();
            foreach (var d in existentes) services.Remove(d);
            services.AddDbContext<PeajeSysDbContext>(o => o.UseInMemoryDatabase(_nombreBd));
        });
    }
}

public class TurnosHttpTests : IClassFixture<PeajeSysApiMemoriaFactory>
{
    private readonly HttpClient _cliente;
    private readonly PeajeSysApiMemoriaFactory _fabrica;

    public TurnosHttpTests(PeajeSysApiMemoriaFactory fabrica)
    {
        _fabrica = fabrica;
        _cliente = fabrica.CreateClient();
    }

    private static string Token(int id, string rol, string codigo)
    {
        var servicio = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return servicio.GenerateToken(new Operador
        {
            IdOperador = id, CodigoEmpleado = codigo, Nombres = "Prueba", Apellidos = "Http", Rol = rol, Estado = EstadosOperador.Activo
        });
    }

    private Task<HttpResponseMessage> Enviar(HttpMethod metodo, string url, string token, string? json = null)
    {
        var peticion = new HttpRequestMessage(metodo, url);
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (json != null) peticion.Content = new StringContent(json, Encoding.UTF8, "application/json");
        return _cliente.SendAsync(peticion);
    }

    private long SembrarTurno(int idOperador, int idCaseta)
    {
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<PeajeSysDbContext>();
        var turno = new Turno { IdCaseta = idCaseta, IdOperador = idOperador, FondoInicialCaja = 1000, Estado = "ABIERTO" };
        db.Turnos.Add(turno);
        db.SaveChanges();
        return turno.IdTurno;
    }

    private static async Task<JsonElement> Error(HttpResponseMessage r)
    {
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("error").Clone();
    }

    [Fact]
    public async Task Abrir_RecaudadorConIdOperadorAjeno_QuedaANombreDelToken()
    {
        var token = Token(21, Roles.Recaudador, "REC-021");

        var r = await Enviar(HttpMethod.Post, "/api/turnos/abrir", token, """{"id_caseta":201,"id_operador":22,"fondo_inicial_caja":5000,"diurno":true}""");

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        Assert.Equal(21, doc.RootElement.GetProperty("id_operador").GetInt32());
    }

    [Fact]
    public async Task Abrir_FondoNegativo_Devuelve422ConSobreEstandar()
    {
        var token = Token(23, Roles.Recaudador, "REC-023");

        var r = await Enviar(HttpMethod.Post, "/api/turnos/abrir", token, """{"id_caseta":202,"fondo_inicial_caja":-1,"diurno":true}""");

        Assert.Equal((HttpStatusCode)422, r.StatusCode);
        var error = await Error(r);
        Assert.Equal("ERROR_VALIDACION", error.GetProperty("codigo").GetString());
        Assert.True(error.GetProperty("campos").TryGetProperty("fondo_inicial_caja", out _));
    }

    [Fact]
    public async Task Obtener_RecaudadorAjeno_Devuelve403TurnoAjeno()
    {
        long id = SembrarTurno(31, 301);

        var r = await Enviar(HttpMethod.Get, $"/api/turnos/{id}", Token(32, Roles.Recaudador, "REC-032"));

        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal("TURNO_AJENO", (await Error(r)).GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task Obtener_Supervisor_Devuelve200()
    {
        long id = SembrarTurno(33, 302);

        var r = await Enviar(HttpMethod.Get, $"/api/turnos/{id}", Token(34, Roles.Supervisor, "SUP-034"));

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
    }

    [Fact]
    public async Task Cerrar_RecaudadorAjeno_Devuelve403()
    {
        long id = SembrarTurno(35, 303);

        var r = await Enviar(HttpMethod.Post, $"/api/turnos/{id}/cierre", Token(36, Roles.Recaudador, "REC-036"), """{"total_declarado_cierre":1000}""");

        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal("TURNO_AJENO", (await Error(r)).GetProperty("codigo").GetString());
    }
}
