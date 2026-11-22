using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;
using PeajeSys.Tests.Cobro;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class TarifaVigenciaTests
{
    [Fact]
    public void ActualizarVigenciaTarifa_TarifaPreviaExistente_CierraVigenciaAnteriorElDiaAnteriorYActivaNueva()
    {
        // Arrange
        var tarifaAnterior = new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10500m,
            ResolucionLegal = "Res. 001/2026",
            FechaInicioVigencia = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            FechaFinVigencia = null,
            Activa = true
        };

        var fechaNueva = new DateTime(2026, 11, 19, 0, 0, 0, DateTimeKind.Utc);
        var tarifaNueva = new Tarifa
        {
            IdTarifa = 2,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 12000m,
            ResolucionLegal = "Res. 045/2026",
            FechaInicioVigencia = fechaNueva,
            FechaFinVigencia = null,
            Activa = true
        };

        // Act
        TarifaService.ActualizarVigenciaTarifa(tarifaAnterior, tarifaNueva);

        // Assert
        // La tarifa anterior debe cerrarse con la fecha del dia anterior al inicio de la nueva
        Assert.Equal(fechaNueva.AddDays(-1), tarifaAnterior.FechaFinVigencia);
        Assert.False(tarifaAnterior.Activa);

        // La nueva tarifa debe quedar activa e indefinida
        Assert.Null(tarifaNueva.FechaFinVigencia);
        Assert.True(tarifaNueva.Activa);
        Assert.Equal(12000m, tarifaNueva.Monto);
    }

    [Fact]
    public void ActualizarVigenciaTarifa_PrimeraTarifaDeCategoria_CreaConFinNullYActiva()
    {
        // Arrange
        Tarifa? tarifaAnterior = null;
        var tarifaNueva = new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 2,
            IdCategoria = 3,
            Monto = 15000m,
            FechaInicioVigencia = DateTime.UtcNow,
            FechaFinVigencia = null,
            Activa = true
        };

        // Act
        TarifaService.ActualizarVigenciaTarifa(tarifaAnterior, tarifaNueva);

        // Assert
        Assert.Null(tarifaNueva.FechaFinVigencia);
        Assert.True(tarifaNueva.Activa);
    }

    [Theory]
    [InlineData("2026-01-01")] // Misma fecha que la anterior
    [InlineData("2025-12-31")] // Fecha anterior
    public void ActualizarVigenciaTarifa_FechaNuevaMenorOIgualAAnterior_LanzaAppException422VigenciaInvalida(string fechaStr)
    {
        var tarifaAnterior = new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10500m,
            FechaInicioVigencia = new DateTime(2026, 1, 1),
            Activa = true
        };

        var tarifaNueva = new Tarifa
        {
            IdTarifa = 2,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 12000m,
            FechaInicioVigencia = DateTime.Parse(fechaStr),
            Activa = true
        };

        var ex = Assert.Throws<AppException>(() => TarifaService.ActualizarVigenciaTarifa(tarifaAnterior, tarifaNueva));
        Assert.Equal("VIGENCIA_INVALIDA", ex.Codigo);
        Assert.Equal(422, ex.StatusCode);
    }

    [Fact]
    public async Task CrearTarifaConVigencia_FechaNuevaMenorOIgualAAnterior_LanzaAppException422()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1" });
        db.CategoriasVehiculo.Add(new CategoriaVehiculo { IdCategoria = 1, Codigo = "CAT_I", Descripcion = "Cat 1", NumeroEjesMin = 2, NumeroEjesMax = 2 });
        db.Tarifas.Add(new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10000m,
            FechaInicioVigencia = new DateTime(2026, 6, 1),
            Activa = true
        });
        await db.SaveChangesAsync();

        var servicio = new TarifaService(db, NullLogger<TarifaService>.Instance);
        var req = new CrearTarifaRequestDto
        {
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 12000m,
            FechaInicioVigencia = new DateTime(2026, 5, 1)
        };

        var ex = await Assert.ThrowsAsync<AppException>(() => servicio.CrearTarifaConVigenciaAsync(req, "ADM-001"));
        Assert.Equal("VIGENCIA_INVALIDA", ex.Codigo);
        Assert.Equal(422, ex.StatusCode);
    }

    [Fact]
    public async Task CrearTarifaConVigencia_FechaNuevaPosterior_CierraAnteriorElDiaAnterior()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1" });
        db.CategoriasVehiculo.Add(new CategoriaVehiculo { IdCategoria = 1, Codigo = "CAT_I", Descripcion = "Cat 1", NumeroEjesMin = 2, NumeroEjesMax = 2 });
        db.Tarifas.Add(new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10000m,
            FechaInicioVigencia = new DateTime(2026, 1, 1),
            Activa = true
        });
        await db.SaveChangesAsync();

        var servicio = new TarifaService(db, NullLogger<TarifaService>.Instance);
        var req = new CrearTarifaRequestDto
        {
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 12000m,
            FechaInicioVigencia = new DateTime(2026, 12, 1)
        };

        var res = await servicio.CrearTarifaConVigenciaAsync(req, "ADM-001");
        var anterior = await db.Tarifas.FindAsync(1);

        Assert.NotNull(anterior);
        Assert.Equal(new DateTime(2026, 11, 30), anterior.FechaFinVigencia);
    }

    [Fact]
    public async Task Cobro_ConTarifaFutura_UsaTarifaVigenteDeHoy()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new PeajeSysDbContext(options);
        db.EstacionesPeaje.Add(new EstacionPeaje { IdEstacion = 1, Nombre = "E1", CodigoEstacion = "E1" });
        db.Casetas.Add(new Caseta { IdCaseta = 1, IdEstacion = 1, Estado = "OPERATIVA" });
        db.CategoriasVehiculo.Add(new CategoriaVehiculo { IdCategoria = 1, Codigo = "CAT_I", Descripcion = "Cat 1", NumeroEjesMin = 2, NumeroEjesMax = 2 });
        db.Turnos.Add(new Turno { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Estado = "ABIERTO" });

        var hoy = ZonaHorariaApp.HoyComoFecha();
        // Tarifa actual (10000)
        db.Tarifas.Add(new Tarifa
        {
            IdTarifa = 1,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 10000m,
            FechaInicioVigencia = hoy.AddDays(-10),
            FechaFinVigencia = hoy.AddDays(4), // Se vence en 4 dias
            Activa = true
        });

        // Tarifa futura (15000), empieza en 5 dias
        db.Tarifas.Add(new Tarifa
        {
            IdTarifa = 2,
            IdEstacion = 1,
            IdCategoria = 1,
            Monto = 15000m,
            FechaInicioVigencia = hoy.AddDays(5),
            FechaFinVigencia = null,
            Activa = true
        });
        await db.SaveChangesAsync();

        var cobroService = new CobroService(db, new GeneradorTicketFalso(), new AjustesAtomicosEnMemoria(db));
        var reqCobro = new CobroRequestDto
        {
            IdTurno = 1,
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 10000m
        };
        var actor = new ActorOperacion(1, "REC-001", Roles.Recaudador);

        var respuesta = await cobroService.ProcesarCobroAsync(reqCobro, actor);

        Assert.Equal(10000m, respuesta.MontoTarifa);
        var tx = await db.TransaccionesPeaje.FindAsync(respuesta.IdTransaccion);
        Assert.NotNull(tx);
        Assert.Equal(1, tx.IdTarifa);
    }
}
