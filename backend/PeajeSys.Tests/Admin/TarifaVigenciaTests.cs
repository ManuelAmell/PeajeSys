using System;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class TarifaVigenciaTests
{
    [Fact]
    public void ActualizarVigenciaTarifa_TarifaPreviaExistente_CierraVigenciaAnteriorYActivaNueva()
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
        // La tarifa anterior debe cerrarse con la fecha de inicio de la nueva
        Assert.Equal(fechaNueva, tarifaAnterior.FechaFinVigencia);
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
}
