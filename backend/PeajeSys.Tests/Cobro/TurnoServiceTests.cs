using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class TurnoServiceTests
{
    private static readonly ActorOperacion Actor = new(1, "REC-001", "RECAUDADOR");

    // Mock simulado de ITurnoService para pruebas de logica de ciclo de vida
    private class TurnoServiceSimulado : ITurnoService
    {
        private readonly Dictionary<long, TurnoDto> _turnos = new();
        private long _consecutivo = 1;

        public TurnoServiceSimulado()
        {
            // Turno 1: ABIERTO en caseta 1, operador 1
            _turnos[1] = new TurnoDto
            {
                IdTurno = 1,
                IdCaseta = 1,
                IdOperador = 1,
                Fecha = "2026-03-01",
                Diurno = true,
                FondoInicialCaja = 200000,
                TotalRecaudadoEfectivo = 10500,
                Estado = "ABIERTO"
            };

            // Turno 2: CERRADO en caseta 2, operador 2
            _turnos[2] = new TurnoDto
            {
                IdTurno = 2,
                IdCaseta = 2,
                IdOperador = 2,
                Fecha = "2026-03-01",
                Diurno = true,
                FondoInicialCaja = 200000,
                TotalRecaudadoEfectivo = 50000,
                TotalDeclaradoCierre = 50000,
                DiferenciaDescuadre = 0,
                Estado = "CERRADO"
            };

            _consecutivo = 3;
        }

        public Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request, ActorOperacion actor)
        {
            if (request.IdCaseta <= 0)
                throw new AppException("CASETA_REQUERIDA", "Caseta invalida.", 400);

            if (request.IdOperador <= 0)
                throw new AppException("OPERADOR_REQUERIDO", "Operador invalido.", 400);

            // Validar caseta ocupada
            foreach (var t in _turnos.Values)
            {
                if (t.IdCaseta == request.IdCaseta && t.Estado == "ABIERTO")
                    throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");
            }

            // Validar operador con turno activo
            foreach (var t in _turnos.Values)
            {
                if (t.IdOperador == request.IdOperador && t.Estado == "ABIERTO")
                    throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO en el sistema.");
            }

            long nuevoId = _consecutivo++;
            var nuevoTurno = new TurnoDto
            {
                IdTurno = nuevoId,
                IdCaseta = request.IdCaseta,
                IdOperador = request.IdOperador,
                Fecha = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Diurno = request.Diurno,
                FondoInicialCaja = request.FondoInicialCaja,
                TotalRecaudadoEfectivo = 0,
                Estado = "ABIERTO"
            };

            _turnos[nuevoId] = nuevoTurno;

            return Task.FromResult(new AbrirTurnoResponseDto
            {
                IdTurno = nuevoId,
                IdCaseta = request.IdCaseta,
                IdOperador = request.IdOperador,
                Fecha = nuevoTurno.Fecha,
                Diurno = nuevoTurno.Diurno,
                FondoInicialCaja = nuevoTurno.FondoInicialCaja,
                TotalRecaudadoEfectivo = 0,
                Estado = "ABIERTO"
            });
        }

        public Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request, ActorOperacion actor)
        {
            if (!_turnos.TryGetValue(idTurno, out var turno))
                throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe el turno {idTurno}.");

            if (turno.Estado == "CERRADO")
                throw new ConflictException("TURNO_YA_CERRADO", "El turno ya se encuentra cerrado.");

            if (request.TotalDeclaradoCierre < 0)
                throw new AppException("ERROR_VALIDACION", "El total declarado no puede ser negativo.", 422);

            turno.Estado = "CERRADO";
            turno.TotalDeclaradoCierre = request.TotalDeclaradoCierre;
            turno.DiferenciaDescuadre = request.TotalDeclaradoCierre - turno.TotalRecaudadoEfectivo;

            return Task.FromResult(turno);
        }

        public Task<TurnoDto> ObtenerTurnoAsync(long idTurno, ActorOperacion actor)
        {
            if (!_turnos.TryGetValue(idTurno, out var turno))
                throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe el turno {idTurno}.");

            return Task.FromResult(turno);
        }

        public Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, ActorOperacion actor)
        {
            int? idOperador = int.TryParse(operador, out var idParseado) ? idParseado : null;
            var resultado = new List<TurnoDto>();
            foreach (var t in _turnos.Values)
            {
                if (idCaseta.HasValue && t.IdCaseta != idCaseta.Value)
                    continue;
                if (idOperador.HasValue && t.IdOperador != idOperador.Value)
                    continue;
                if (!string.IsNullOrWhiteSpace(estado) && !t.Estado.Equals(estado, StringComparison.OrdinalIgnoreCase))
                    continue;

                resultado.Add(t);
            }

            return Task.FromResult<IEnumerable<TurnoDto>>(resultado);
        }
    }

    [Fact]
    public async Task AbrirTurno_CasetaConTurnoAbierto_LanzaConflictExceptionCasetaOcupada()
    {
        // Arrange
        var service = new TurnoServiceSimulado();
        var request = new AbrirTurnoRequestDto
        {
            IdCaseta = 1, // Caseta 1 ya tiene turno abierto
            IdOperador = 9,
            FondoInicialCaja = 100000
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.AbrirTurnoAsync(request, Actor));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("CASETA_OCUPADA", ex.Codigo);
    }

    [Fact]
    public async Task AbrirTurno_OperadorConTurnoAbierto_LanzaConflictExceptionOperadorConTurnoActivo()
    {
        // Arrange
        var service = new TurnoServiceSimulado();
        var request = new AbrirTurnoRequestDto
        {
            IdCaseta = 3,
            IdOperador = 1, // Operador 1 ya tiene turno abierto en caseta 1
            FondoInicialCaja = 100000
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.AbrirTurnoAsync(request, Actor));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("OPERADOR_CON_TURNO_ACTIVO", ex.Codigo);
    }

    [Fact]
    public async Task AbrirTurno_CasetaYOperadorDisponibles_CreaTurnoConEstadoAbierto()
    {
        // Arrange
        var service = new TurnoServiceSimulado();
        var request = new AbrirTurnoRequestDto
        {
            IdCaseta = 4,
            IdOperador = 4,
            FondoInicialCaja = 250000,
            Diurno = true
        };

        // Act
        var response = await service.AbrirTurnoAsync(request, Actor);

        // Assert
        Assert.True(response.IdTurno > 0);
        Assert.Equal(4, response.IdCaseta);
        Assert.Equal(4, response.IdOperador);
        Assert.Equal("ABIERTO", response.Estado);
        Assert.Equal(250000, response.FondoInicialCaja);
    }

    [Fact]
    public async Task CerrarTurno_TurnoYaCerrado_LanzaConflictExceptionTurnoYaCerrado()
    {
        // Arrange
        var service = new TurnoServiceSimulado();
        var request = new CerrarTurnoRequestDto { TotalDeclaradoCierre = 50000 };

        // Act & Assert: Turno 2 ya esta cerrado
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CerrarTurnoAsync(2, request, Actor));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TURNO_YA_CERRADO", ex.Codigo);
    }

    [Fact]
    public async Task CerrarTurno_TurnoInexistente_LanzaNotFoundException()
    {
        // Arrange
        var service = new TurnoServiceSimulado();
        var request = new CerrarTurnoRequestDto { TotalDeclaradoCierre = 10000 };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => service.CerrarTurnoAsync(999, request, Actor));
        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("TURNO_NO_ENCONTRADO", ex.Codigo);
    }

    [Fact]
    public async Task CerrarTurno_CalculaDescuadreCorrectamente_FaltanteEnCaja()
    {
        // Arrange
        // Turno 1: Recaudado = 10.500 COP, Declarado = 10.000 COP -> Descuadre = -500 COP
        var service = new TurnoServiceSimulado();
        var request = new CerrarTurnoRequestDto { TotalDeclaradoCierre = 10000 };

        // Act
        var response = await service.CerrarTurnoAsync(1, request, Actor);

        // Assert
        Assert.Equal("CERRADO", response.Estado);
        Assert.Equal(10500, response.TotalRecaudadoEfectivo);
        Assert.Equal(10000, response.TotalDeclaradoCierre);
        Assert.Equal(-500, response.DiferenciaDescuadre);
    }

    [Fact]
    public async Task CerrarTurno_CalculaDescuadreCorrectamente_SobranteEnCaja()
    {
        // Arrange
        // Turno 1: Recaudado = 10.500 COP, Declarado = 12.000 COP -> Descuadre = +1.500 COP
        var service = new TurnoServiceSimulado();
        var request = new CerrarTurnoRequestDto { TotalDeclaradoCierre = 12000 };

        // Act
        var response = await service.CerrarTurnoAsync(1, request, Actor);

        // Assert
        Assert.Equal(1500, response.DiferenciaDescuadre);
    }
}
