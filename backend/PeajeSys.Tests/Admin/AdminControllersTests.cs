using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Api.Controllers;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class AdminControllersTests
{
    private class FakeTarifaService : ITarifaService
    {
        public Task<IEnumerable<TarifaDto>> ListarTarifasAsync(int? idEstacion, int? idCategoria, bool? vigente)
        {
            var list = new List<TarifaDto>
            {
                new() { IdTarifa = 1, IdEstacion = 1, IdCategoria = 1, Monto = 10500m, Activa = true }
            };
            return Task.FromResult<IEnumerable<TarifaDto>>(list);
        }

        public Task<TarifaDto> ObtenerTarifaVigenteAsync(int idEstacion, int idCategoria)
        {
            return Task.FromResult(new TarifaDto
            {
                IdTarifa = 1,
                IdEstacion = idEstacion,
                IdCategoria = idCategoria,
                Monto = 10500m,
                Activa = true
            });
        }

        public Task<TarifaDto> CrearTarifaConVigenciaAsync(CrearTarifaRequestDto request, string usuarioResponsable)
        {
            return Task.FromResult(new TarifaDto
            {
                IdTarifa = 2,
                IdEstacion = request.IdEstacion,
                IdCategoria = request.IdCategoria,
                Monto = request.Monto,
                Activa = true
            });
        }
    }

    private class FakeCategoriaService : ICategoriaService
    {
        public Task<IEnumerable<CategoriaVehiculoDto>> ListarCategoriasAsync(bool? activo)
        {
            var list = new List<CategoriaVehiculoDto>
            {
                new() { IdCategoria = 1, Codigo = "CAT_I", Descripcion = "Automoviles", Activo = true }
            };
            return Task.FromResult<IEnumerable<CategoriaVehiculoDto>>(list);
        }

        public Task<CategoriaVehiculoDto> ObtenerCategoriaPorIdAsync(int id)
        {
            return Task.FromResult(new CategoriaVehiculoDto { IdCategoria = id, Codigo = "CAT_I" });
        }

        public Task<CategoriaVehiculoDto> CrearCategoriaAsync(CrearCategoriaRequestDto request)
        {
            return Task.FromResult(new CategoriaVehiculoDto
            {
                IdCategoria = 8,
                Codigo = request.Codigo,
                Descripcion = request.Descripcion,
                Activo = request.Activo
            });
        }
    }

    [Fact]
    public async Task TarifasController_ListarTarifas_Retorna200ConLista()
    {
        // Arrange
        var controller = new TarifasController(new FakeTarifaService());

        // Act
        var result = await controller.ListarTarifas(1, null, null, null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<TarifaDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task TarifasController_ObtenerTarifaVigente_Retorna200ConTarifa()
    {
        // Arrange
        var controller = new TarifasController(new FakeTarifaService());

        // Act
        var result = await controller.ObtenerTarifaVigente(1, null, 1, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var tarifa = Assert.IsType<TarifaDto>(okResult.Value);
        Assert.Equal(10500m, tarifa.Monto);
    }

    [Fact]
    public async Task TarifasController_CrearTarifa_Retorna201ConNuevaTarifa()
    {
        // Arrange
        var controller = new TarifasController(new FakeTarifaService());
        var request = new CrearTarifaRequestDto { IdEstacion = 1, IdCategoria = 1, Monto = 12000m };

        // Act
        var result = await controller.CrearTarifa(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);
        var response = Assert.IsType<TarifaDto>(statusResult.Value);
        Assert.Equal(12000m, response.Monto);
    }

    [Fact]
    public async Task CategoriasController_ListarCategorias_Retorna200ConCatalogo()
    {
        // Arrange
        var controller = new CategoriasController(new FakeCategoriaService());

        // Act
        var result = await controller.ListarCategorias(true);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CategoriaVehiculoDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task CategoriasController_CrearCategoria_Retorna201()
    {
        // Arrange
        var controller = new CategoriasController(new FakeCategoriaService());
        var request = new CrearCategoriaRequestDto { Codigo = "CAT_VIII", Descripcion = "Especial", NumeroEjesMin = 6, NumeroEjesMax = 8 };

        // Act
        var result = await controller.CrearCategoria(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);
        var response = Assert.IsType<CategoriaVehiculoDto>(statusResult.Value);
        Assert.Equal("CAT_VIII", response.Codigo);
    }
}
