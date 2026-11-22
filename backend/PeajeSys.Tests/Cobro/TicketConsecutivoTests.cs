using System;
using System.Text.RegularExpressions;
using PeajeSys.Api.Services;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class TicketConsecutivoTests
{
    [Fact]
    public void FormatearNumeroTicket_GeneraEstructuraFiscalCorrecta()
    {
        // Arrange
        var fecha = new DateTime(2026, 3, 1, 14, 30, 0, DateTimeKind.Utc);
        long secuencia = 42;

        // Act
        string ticket = CobroService.FormatearNumeroTicket(fecha, secuencia);

        // Assert
        Assert.Equal("TCK-20260301-00042", ticket);
    }

    [Theory]
    [InlineData(1, "00001")]
    [InlineData(99, "00099")]
    [InlineData(1234, "01234")]
    [InlineData(54321, "54321")]
    public void FormatearNumeroTicket_RellenaConCerosALaIzquierdaCincoDigitos(long seq, string esperadoPadded)
    {
        // Arrange
        var fecha = new DateTime(2026, 5, 10);

        // Act
        string ticket = CobroService.FormatearNumeroTicket(fecha, seq);

        // Assert
        Assert.EndsWith(esperadoPadded, ticket);
        Assert.Matches(@"^TCK-\d{8}-\d{5}$", ticket);
    }

    [Fact]
    public void FormatearNumeroTicket_GeneraConsecutivosContinuosSinSaltos()
    {
        // Arrange
        var fecha = new DateTime(2026, 6, 15);
        long inicio = 100;

        // Act & Assert
        for (int i = 0; i < 10; i++)
        {
            string tck = CobroService.FormatearNumeroTicket(fecha, inicio + i);
            string esperado = $"TCK-20260615-00{100 + i}";
            Assert.Equal(esperado, tck);
        }
    }
}
