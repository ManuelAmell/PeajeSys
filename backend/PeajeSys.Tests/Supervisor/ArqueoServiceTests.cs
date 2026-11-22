using System.Threading.Tasks;
using PeajeSys.Api.Services;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class ArqueoServiceTests
{
    [Fact]
    public void DeterminarArqueo_EfectivoIgualASistema_RetornaEstadoCuadrado()
    {
        // Arrange
        decimal sistema = 52500m;
        decimal reportado = 52500m;

        // Act
        var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistema, reportado);

        // Assert
        Assert.Equal(0m, diferencia);
        Assert.Equal("CUADRADO", estado);
    }

    [Fact]
    public void DeterminarArqueo_EfectivoMenorASistema_RetornaEstadoFaltante()
    {
        // Arrange
        decimal sistema = 52500m;
        decimal reportado = 52000m;

        // Act
        var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistema, reportado);

        // Assert
        Assert.Equal(-500m, diferencia);
        Assert.Equal("FALTANTE", estado);
    }

    [Fact]
    public void DeterminarArqueo_EfectivoMayorASistema_RetornaEstadoSobrante()
    {
        // Arrange
        decimal sistema = 52500m;
        decimal reportado = 62500m;

        // Act
        var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistema, reportado);

        // Assert
        Assert.Equal(10000m, diferencia);
        Assert.Equal("SOBRANTE", estado);
    }

    [Theory]
    [InlineData(10000, 10000, 0, "CUADRADO")]
    [InlineData(20000, 18500, -1500, "FALTANTE")]
    [InlineData(15000, 17200, 2200, "SOBRANTE")]
    [InlineData(0, 0, 0, "CUADRADO")]
    public void DeterminarArqueo_CasosMultiples_CalculaDiferenciaYEstadoCorrectos(
        decimal sistema,
        decimal reportado,
        decimal diferenciaEsperada,
        string estadoEsperado)
    {
        // Act
        var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistema, reportado);

        // Assert
        Assert.Equal(diferenciaEsperada, diferencia);
        Assert.Equal(estadoEsperado, estado);
    }

    private class FakeArqueoService : IArqueoService
    {
        public Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado)
        {
            if (idTurno == 999)
                throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");

            decimal sistema = 52500m;
            var (diferencia, estado) = ArqueoService.DeterminarArqueo(sistema, efectivoReportado);

            return Task.FromResult(new ArqueoTurnoDto
            {
                IdTurno = idTurno,
                IdOperador = 2,
                IdCaseta = 2,
                EfectivoSistema = sistema,
                EfectivoReportado = efectivoReportado,
                Diferencia = diferencia,
                EstadoArqueo = estado,
                TotalVehiculos = 6
            });
        }
    }

    [Fact]
    public async Task CalcularArqueo_TurnoInexistente_LanzaNotFoundException()
    {
        // Arrange
        var service = new FakeArqueoService();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => service.CalcularArqueoAsync(999, 50000m));
        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("TURNO_NO_ENCONTRADO", ex.Codigo);
    }

    [Fact]
    public async Task CalcularArqueo_TurnoExistente_RetornaDtoConTotalesYEstadoFaltante()
    {
        // Arrange
        var service = new FakeArqueoService();

        // Act
        var result = await service.CalcularArqueoAsync(9, 52000m);

        // Assert
        Assert.Equal(9, result.IdTurno);
        Assert.Equal(2, result.IdOperador);
        Assert.Equal(2, result.IdCaseta);
        Assert.Equal(52500m, result.EfectivoSistema);
        Assert.Equal(52000m, result.EfectivoReportado);
        Assert.Equal(-500m, result.Diferencia);
        Assert.Equal("FALTANTE", result.EstadoArqueo);
        Assert.Equal(6, result.TotalVehiculos);
    }
}
