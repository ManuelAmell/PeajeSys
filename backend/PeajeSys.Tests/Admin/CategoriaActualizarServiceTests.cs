using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class CategoriaActualizarServiceTests
{
    private static (CategoriaService servicio, PeajeSysDbContext db) CrearContexto()
    {
        var options = new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new PeajeSysDbContext(options);

        var cat1 = new CategoriaVehiculo
        {
            IdCategoria = 1,
            Codigo = "CAT_I",
            Descripcion = "Automoviles",
            NumeroEjesMin = 2,
            NumeroEjesMax = 2,
            PesoMaximoTon = 3.5m,
            Activo = true
        };
        var cat2 = new CategoriaVehiculo
        {
            IdCategoria = 2,
            Codigo = "CAT_II",
            Descripcion = "Buses",
            NumeroEjesMin = 2,
            NumeroEjesMax = 3,
            PesoMaximoTon = 8.0m,
            Activo = true
        };

        db.CategoriasVehiculo.AddRange(cat1, cat2);
        db.SaveChanges();

        var servicio = new CategoriaService(db, NullLogger<CategoriaService>.Instance);
        return (servicio, db);
    }

    [Fact]
    public async Task ActualizarCategoria_CasoValido_ActualizaCamposYRetornaDto()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarCategoriaRequestDto
        {
            Descripcion = "Automoviles y camperos",
            PesoMaximoTon = 4.0m,
            Activo = false
        };

        var resultado = await servicio.ActualizarCategoriaAsync(1, request, "ADM-001");

        Assert.Equal("Automoviles y camperos", resultado.Descripcion);
        Assert.Equal(4.0m, resultado.PesoMaximoTon);
        Assert.False(resultado.Activo);

        var guardada = await db.CategoriasVehiculo.FindAsync(1);
        Assert.NotNull(guardada);
        Assert.Equal("Automoviles y camperos", guardada.Descripcion);
        Assert.Equal(4.0m, guardada.PesoMaximoTon);
        Assert.False(guardada.Activo);
    }

    [Fact]
    public async Task ActualizarCategoria_IdInexistente_LanzaNotFoundException404()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarCategoriaRequestDto { Descripcion = "Inexistente" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            servicio.ActualizarCategoriaAsync(999, request, "ADM-001"));

        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("CATEGORIA_NO_ENCONTRADA", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarCategoria_EjesInvalidos_LanzaAppException422()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarCategoriaRequestDto
        {
            NumeroEjesMin = 4,
            NumeroEjesMax = 2
        };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ActualizarCategoriaAsync(1, request, "ADM-001"));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1.5)]
    public async Task ActualizarCategoria_PesoInvalido_LanzaAppException422(decimal pesoInvalido)
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        var request = new ActualizarCategoriaRequestDto { PesoMaximoTon = pesoInvalido };

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            servicio.ActualizarCategoriaAsync(1, request, "ADM-001"));

        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ERROR_VALIDACION", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarCategoria_CodigoDuplicado_LanzaConflictException409()
    {
        var (servicio, db) = CrearContexto();
        using var _ = db;

        // Categoria 2 ya tiene codigo CAT_II. Intentar cambiar Categoria 1 a CAT_II debe violar unicidad
        var request = new ActualizarCategoriaRequestDto { Codigo = "CAT_II" };

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            servicio.ActualizarCategoriaAsync(1, request, "ADM-001"));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("CODIGO_DUPLICADO", ex.Codigo);
    }
}
