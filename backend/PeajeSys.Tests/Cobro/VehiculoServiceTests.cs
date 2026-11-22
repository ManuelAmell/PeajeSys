using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Api.Services;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Data;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class VehiculoServiceTests
{
    private static PeajeSysDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<PeajeSysDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task ConsultarVehiculoAsync_PlacaInexistente_LanzaNotFoundExceptionConCodigoVehiculoNoEncontrado()
    {
        using var db = NuevoContexto();
        var servicio = new VehiculoService(db);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => servicio.ConsultarVehiculoAsync("ZZZ999"));

        Assert.Equal("VEHICULO_NO_ENCONTRADO", ex.Codigo);
        Assert.Equal(404, ex.StatusCode);
        Assert.Contains("ZZZ999", ex.Message);
    }

    [Fact]
    public async Task ConsultarVehiculoAsync_PlacaExistente_RetornaDtoConVehiculoYCuenta()
    {
        using var db = NuevoContexto();
        db.CategoriasVehiculo.Add(new CategoriaVehiculo
        {
            IdCategoria = 1,
            Codigo = "CAT_I",
            Descripcion = "Automoviles"
        });
        db.Vehiculos.Add(new Vehiculo
        {
            Placa = "KJN456",
            IdCategoria = 1,
            Marca = "Mazda",
            Modelo = "3",
            Color = "Rojo"
        });
        db.CuentasTelepeaje.Add(new CuentaTelepeaje
        {
            IdCuenta = 1,
            PlacaVehiculo = "KJN456",
            TagRfidSerial = "TAG-123456",
            SaldoDisponible = 50000m,
            EstadoCuenta = "ACTIVA"
        });
        await db.SaveChangesAsync();

        var servicio = new VehiculoService(db);

        var resultado = await servicio.ConsultarVehiculoAsync("kjn 456");

        Assert.NotNull(resultado);
        Assert.Equal("KJN456", resultado.Placa);
        Assert.True(resultado.Encontrado);
        Assert.NotNull(resultado.Vehiculo);
        Assert.Equal("KJN456", resultado.Vehiculo.Placa);
        Assert.Equal(1, resultado.Vehiculo.IdCategoria);
        Assert.NotNull(resultado.Cuenta);
        Assert.Equal("TAG-123456", resultado.Cuenta.TagRfidSerial);
        Assert.Equal(50000m, resultado.Cuenta.SaldoDisponible);
    }
}
