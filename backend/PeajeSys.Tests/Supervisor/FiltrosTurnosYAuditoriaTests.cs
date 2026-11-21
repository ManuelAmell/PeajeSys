using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Tests.Api;
using PeajeSys.Tests.Auth;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class FiltrosTurnosYAuditoriaTests : IClassFixture<PeajeSysApiFactory>
{
    private readonly HttpClient _clienteHttp;

    public FiltrosTurnosYAuditoriaTests(PeajeSysApiFactory fabrica)
    {
        _clienteHttp = fabrica.CreateClient();
    }

    private static PeajeSysDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static string GenerarToken(string rol)
    {
        var servicio = new JwtTokenService(JwtPruebas.Clave, JwtPruebas.Issuer, JwtPruebas.Audience, JwtPruebas.ExpirationHours);
        return servicio.GenerateToken(new Operador
        {
            IdOperador = 1,
            CodigoEmpleado = "SUP-001",
            Nombres = "Supervisor",
            Apellidos = "Pruebas",
            Rol = rol,
            Estado = EstadosOperador.Activo
        });
    }

    private async Task<PeajeSysDbContext> CrearEscenarioTurnosAsync()
    {
        var db = NuevoContexto();

        var est1 = new EstacionPeaje { IdEstacion = 1, CodigoEstacion = "EST-01", Nombre = "Estacion Central" };
        var est2 = new EstacionPeaje { IdEstacion = 2, CodigoEstacion = "EST-02", Nombre = "Estacion Norte" };
        db.EstacionesPeaje.AddRange(est1, est2);

        var cas1 = new Caseta { IdCaseta = 1, IdEstacion = 1, NumeroCarril = 1, TipoCarril = "MANUAL", Estacion = est1 };
        var cas2 = new Caseta { IdCaseta = 2, IdEstacion = 2, NumeroCarril = 1, TipoCarril = "MANUAL", Estacion = est2 };
        db.Casetas.AddRange(cas1, cas2);

        var op1 = new Operador { IdOperador = 1, CodigoEmpleado = "REC-001", Nombres = "Alex", Apellidos = "Recaudador" };
        var op2 = new Operador { IdOperador = 2, CodigoEmpleado = "REC-002", Nombres = "Camilo", Apellidos = "Recaudador" };
        db.Operadores.AddRange(op1, op2);

        db.Turnos.AddRange(
            new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Fecha = new DateTime(2026, 10, 1), Estado = "CERRADO", Caseta = cas1, Operador = op1 },
            new Turno { IdTurno = 2, IdCaseta = 1, IdOperador = 2, Fecha = new DateTime(2026, 10, 1), Estado = "ABIERTO", Caseta = cas1, Operador = op2 },
            new Turno { IdTurno = 3, IdCaseta = 2, IdOperador = 1, Fecha = new DateTime(2026, 10, 2), Estado = "ABIERTO", Caseta = cas2, Operador = op1 },
            new Turno { IdTurno = 4, IdCaseta = 2, IdOperador = 2, Fecha = new DateTime(2026, 10, 2), Estado = "CERRADO", Caseta = cas2, Operador = op2 }
        );

        await db.SaveChangesAsync();
        return db;
    }

    [Fact]
    public async Task Turnos_FiltroPorCodigoOperador_RetornaTurnosDelOperador()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var turnos = await servicio.ListarTurnosAsync(idCaseta: null, operador: "REC-001", estado: null, fecha: null, idEstacion: null);

        Assert.Equal(2, turnos.Count());
        Assert.All(turnos, t => Assert.Equal(1, t.IdOperador));
    }

    [Fact]
    public async Task Turnos_FiltroPorIdOperadorNumerico_RetornaTurnosDelOperador()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var turnos = await servicio.ListarTurnosAsync(idCaseta: null, operador: "2", estado: null, fecha: null, idEstacion: null);

        Assert.Equal(2, turnos.Count());
        Assert.All(turnos, t => Assert.Equal(2, t.IdOperador));
    }

    [Fact]
    public async Task Turnos_FiltroPorFecha_RetornaTurnosDeEsaFecha()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var turnos = await servicio.ListarTurnosAsync(idCaseta: null, operador: null, estado: null, fecha: "2026-10-01", idEstacion: null);

        Assert.Equal(2, turnos.Count());
        Assert.All(turnos, t => Assert.Equal("2026-10-01", t.Fecha));
    }

    [Fact]
    public async Task Turnos_FiltroPorEstacion_RetornaTurnosDeCasetasDeEsaEstacion()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var turnos = await servicio.ListarTurnosAsync(idCaseta: null, operador: null, estado: null, fecha: null, idEstacion: 1);

        Assert.Equal(2, turnos.Count());
        Assert.All(turnos, t => Assert.Equal(1, t.IdCaseta));
    }

    [Fact]
    public async Task Turnos_FiltroCombinado_RetornaInterseccionExacta()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var turnos = await servicio.ListarTurnosAsync(idCaseta: null, operador: "REC-001", estado: "ABIERTO", fecha: "2026-10-02", idEstacion: 2);

        var turno = Assert.Single(turnos);
        Assert.Equal(3, turno.IdTurno);
        Assert.Equal(2, turno.IdCaseta);
        Assert.Equal(1, turno.IdOperador);
    }

    [Fact]
    public async Task Turnos_FechaInvalida_LanzaFiltroInvalido()
    {
        using var db = await CrearEscenarioTurnosAsync();
        var servicio = new TurnoService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ListarTurnosAsync(idCaseta: null, operador: null, estado: null, fecha: "fecha-invalida", idEstacion: null));

        Assert.Equal("FILTRO_INVALIDO", ex.Codigo);
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task Auditoria_FiltroPorDiaCivilBogota_RespetaBordesUtc()
    {
        using var db = NuevoContexto();
        // Dia civil 2026-11-21 en Bogota (UTC-5) = [2026-11-21T05:00Z, 2026-11-22T05:00Z)
        db.AuditoriasTransaccion.AddRange(
            new AuditoriaTransaccion { IdAuditoria = 1, IdTransaccion = 1, TipoOperacion = "INSERT", UsuarioSistema = "user1", FechaHoraEvento = new DateTime(2026, 11, 21, 4, 59, 59, DateTimeKind.Utc) }, // Fuera (20-nov 23:59:59 Bogota)
            new AuditoriaTransaccion { IdAuditoria = 2, IdTransaccion = 2, TipoOperacion = "INSERT", UsuarioSistema = "user2", FechaHoraEvento = new DateTime(2026, 11, 21, 5, 0, 0, DateTimeKind.Utc) },   // Dentro (21-nov 00:00:00 Bogota)
            new AuditoriaTransaccion { IdAuditoria = 3, IdTransaccion = 3, TipoOperacion = "VOID", UsuarioSistema = "user3", FechaHoraEvento = new DateTime(2026, 11, 22, 4, 59, 59, DateTimeKind.Utc) },   // Dentro (21-nov 23:59:59 Bogota)
            new AuditoriaTransaccion { IdAuditoria = 4, IdTransaccion = 4, TipoOperacion = "INSERT", UsuarioSistema = "user4", FechaHoraEvento = new DateTime(2026, 11, 22, 5, 0, 0, DateTimeKind.Utc) }    // Fuera (22-nov 00:00:00 Bogota)
        );
        await db.SaveChangesAsync();

        var servicio = new AuditoriaService(db);
        var items = (await servicio.ListarAuditoriaAsync(fecha: "2026-11-21", fechaInicio: null, fechaFin: null, tipoOperacion: null, usuario: null)).ToList();

        Assert.Equal(2, items.Count);
        Assert.Contains(items, i => i.IdAuditoria == 2);
        Assert.Contains(items, i => i.IdAuditoria == 3);
    }

    [Fact]
    public async Task Auditoria_FechaInvalida_LanzaFiltroInvalido()
    {
        using var db = NuevoContexto();
        var servicio = new AuditoriaService(db);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ListarAuditoriaAsync(fecha: "fecha-no-valida", fechaInicio: null, fechaFin: null, tipoOperacion: null, usuario: null));

        Assert.Equal("FILTRO_INVALIDO", ex.Codigo);
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task Http_Turnos_OperadorTextoNoDevuelveProblemDetails()
    {
        var token = GenerarToken(Roles.Supervisor);
        var peticion = new HttpRequestMessage(HttpMethod.Get, "/api/turnos?operador=abc");
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respuesta = await _clienteHttp.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var contenido = await respuesta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("The value 'abc' is not valid", contenido);
    }

    [Fact]
    public async Task Http_Turnos_FechaInvalida_DevuelveSobreEstandarFiltroInvalido()
    {
        var token = GenerarToken(Roles.Supervisor);
        var peticion = new HttpRequestMessage(HttpMethod.Get, "/api/turnos?fecha=fecha-mala");
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respuesta = await _clienteHttp.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var json = await respuesta.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("FILTRO_INVALIDO", error.GetProperty("codigo").GetString());
    }
}
