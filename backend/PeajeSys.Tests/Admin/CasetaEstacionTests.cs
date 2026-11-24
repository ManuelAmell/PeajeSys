using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class CasetaEstacionTests
{
    private class FakeEstacionCasetaService : IEstacionCasetaService
    {
        public bool CasetaTieneTurnoAbierto { get; set; } = true;

        public Task<IEnumerable<EstacionDto>> ListarEstacionesAsync() => Task.FromResult<IEnumerable<EstacionDto>>(new List<EstacionDto>());
        public Task<EstacionDto> ObtenerEstacionPorIdAsync(int id) => Task.FromResult(new EstacionDto { IdEstacion = id, Nombre = "Estacion Test" });
        public Task<IEnumerable<CasetaDto>> ListarCasetasAsync(int? idEstacion) => Task.FromResult<IEnumerable<CasetaDto>>(new List<CasetaDto>());
        public Task<CasetaDto> ObtenerCasetaPorIdAsync(int id) => Task.FromResult(new CasetaDto { IdCaseta = id, Estado = "OPERATIVA" });

        public Task<CasetaDto> ActualizarEstadoCasetaAsync(int id, string nuevoEstado)
        {
            string est = (nuevoEstado ?? "").Trim().ToUpperInvariant();

            if ((est == "MANTENIMIENTO" || est == "CERRADA") && CasetaTieneTurnoAbierto)
            {
                throw new ConflictException("TURNO_ABIERTO_EN_CASETA",
                    "La caseta tiene un turno actualmente abierto. Debe cerrar el turno antes de cambiar su estado a CERRADA o MANTENIMIENTO.");
            }

            return Task.FromResult(new CasetaDto
            {
                IdCaseta = id,
                Estado = est
            });
        }
    }

    [Fact]
    public async Task ActualizarEstadoCaseta_AMantenimientoConTurnoAbierto_LanzaConflictException()
    {
        // Arrange
        var service = new FakeEstacionCasetaService { CasetaTieneTurnoAbierto = true };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.ActualizarEstadoCasetaAsync(1, "MANTENIMIENTO"));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TURNO_ABIERTO_EN_CASETA", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarEstadoCaseta_ACerradaConTurnoAbierto_LanzaConflictException()
    {
        // Arrange
        var service = new FakeEstacionCasetaService { CasetaTieneTurnoAbierto = true };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.ActualizarEstadoCasetaAsync(1, "CERRADA"));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TURNO_ABIERTO_EN_CASETA", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarEstadoCaseta_SinTurnoAbierto_PermiteCambioAMantenimiento()
    {
        // Arrange
        var service = new FakeEstacionCasetaService { CasetaTieneTurnoAbierto = false };

        // Act
        var result = await service.ActualizarEstadoCasetaAsync(1, "MANTENIMIENTO");

        // Assert
        Assert.Equal("MANTENIMIENTO", result.Estado);
    }
}
