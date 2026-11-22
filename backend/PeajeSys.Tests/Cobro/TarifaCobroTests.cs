using System;
using PeajeSys.Api.Services;
using PeajeSys.Core.Exceptions;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class TarifaCobroTests
{
    [Fact]
    public void CalcularCambio_EfectivoMayorQueTarifa_RetornaDiferenciaExacta()
    {
        // Arrange
        decimal tarifa = 10500m;
        decimal efectivo = 20000m;

        // Act
        decimal cambio = CobroService.CalcularCambio(tarifa, efectivo);

        // Assert
        Assert.Equal(9500m, cambio);
    }

    [Fact]
    public void CalcularCambio_EfectivoExacto_RetornaCero()
    {
        // Arrange
        decimal tarifa = 15000m;
        decimal efectivo = 15000m;

        // Act
        decimal cambio = CobroService.CalcularCambio(tarifa, efectivo);

        // Assert
        Assert.Equal(0m, cambio);
    }

    [Fact]
    public void ValidarEfectivo_EfectivoMenorQueTarifa_LanzaAppException422EfectivoInsuficiente()
    {
        // Arrange
        decimal tarifa = 10500m;
        decimal efectivo = 5000m;

        // Act & Assert
        var ex = Assert.Throws<AppException>(() => CobroService.ValidarEfectivo(tarifa, efectivo));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("EFECTIVO_INSUFICIENTE", ex.Codigo);
    }

    [Fact]
    public void ValidarCuentaTelepeaje_CuentaActivaConSaldoSuficiente_NoLanzaExcepcion()
    {
        // Arrange
        string estado = "ACTIVA";
        decimal saldo = 50000m;
        decimal tarifa = 10500m;

        // Act & Assert (sin excepcion)
        CobroService.ValidarCuentaTelepeaje(estado, saldo, tarifa);
    }

    [Fact]
    public void ValidarCuentaTelepeaje_CuentaSuspendida_LanzaAppException422CuentaInactiva()
    {
        // Arrange
        string estado = "SUSPENDIDA";
        decimal saldo = 50000m;
        decimal tarifa = 10500m;

        // Act & Assert
        var ex = Assert.Throws<AppException>(() => CobroService.ValidarCuentaTelepeaje(estado, saldo, tarifa));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("CUENTA_INACTIVA", ex.Codigo);
    }

    [Fact]
    public void ValidarCuentaTelepeaje_SaldoMenorQueTarifa_LanzaAppException422SaldoInsuficiente()
    {
        // Arrange
        string estado = "ACTIVA";
        decimal saldo = 5000m;
        decimal tarifa = 10500m;

        // Act & Assert
        var ex = Assert.Throws<AppException>(() => CobroService.ValidarCuentaTelepeaje(estado, saldo, tarifa));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("SALDO_INSUFICIENTE", ex.Codigo);
    }
}
