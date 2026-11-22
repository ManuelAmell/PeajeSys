using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Admin;

public class OperadorAdminTests
{
    private class FakeOperadorAdminService : IOperadorAdminService
    {
        private readonly Dictionary<int, OperadorAdminDto> _operadores = new();
        private int _consecutivo = 1;

        public FakeOperadorAdminService()
        {
            _operadores[1] = new OperadorAdminDto
            {
                IdOperador = 1,
                CodigoEmpleado = "EMP-001",
                NumeroDocumento = "1047123456",
                Nombres = "Carlos",
                Apellidos = "Gomez",
                Rol = "RECAUDADOR",
                Estado = "ACTIVO"
            };
            _consecutivo = 2;
        }

        public Task<IEnumerable<OperadorAdminDto>> ListarOperadoresAsync(string? rol, string? estado, string? q)
        {
            return Task.FromResult<IEnumerable<OperadorAdminDto>>(_operadores.Values);
        }

        public Task<OperadorAdminDto> ObtenerOperadorPorIdAsync(int id)
        {
            if (!_operadores.TryGetValue(id, out var op))
                throw new NotFoundException("OPERADOR_NO_ENCONTRADO", $"No existe operador {id}.");

            return Task.FromResult(op);
        }

        public Task<OperadorAdminDto> CrearOperadorAsync(CrearOperadorRequestDto request)
        {
            string codigo = request.ObtenerCodigo();
            string doc = request.ObtenerDocumento();

            foreach (var op in _operadores.Values)
            {
                if (op.CodigoEmpleado.Equals(codigo, StringComparison.OrdinalIgnoreCase))
                    throw new ConflictException("OPERADOR_DUPLICADO", $"Codigo {codigo} duplicado.");

                if (op.NumeroDocumento == doc)
                    throw new ConflictException("OPERADOR_DUPLICADO", $"Documento {doc} duplicado.");
            }

            int id = _consecutivo++;
            var nuevo = new OperadorAdminDto
            {
                IdOperador = id,
                CodigoEmpleado = codigo,
                NumeroDocumento = doc,
                Nombres = request.Nombres,
                Apellidos = request.Apellidos,
                Rol = request.Rol,
                Estado = request.Estado
            };

            _operadores[id] = nuevo;
            return Task.FromResult(nuevo);
        }

        public Task<OperadorAdminDto> ActualizarOperadorAsync(int id, ActualizarOperadorRequestDto request) =>
            throw new NotSupportedException();

        public Task<OperadorAdminDto> ActualizarEstadoAsync(int id, string nuevoEstado)
        {
            if (!_operadores.TryGetValue(id, out var op))
                throw new NotFoundException("OPERADOR_NO_ENCONTRADO", $"No existe operador {id}.");

            string est = (nuevoEstado ?? "").Trim().ToUpperInvariant();
            if (est != "ACTIVO" && est != "INACTIVO")
                throw new AppException("ESTADO_INVALIDO", "Estado invalido.", 422);

            op.Estado = est;
            return Task.FromResult(op);
        }
    }

    [Fact]
    public async Task CrearOperador_CodigoEmpleadoDuplicado_LanzaConflictException409()
    {
        // Arrange
        var service = new FakeOperadorAdminService();
        var request = new CrearOperadorRequestDto
        {
            CodigoEmpleado = "EMP-001", // Ya existe
            NumeroDocumento = "999888777",
            Nombres = "Nuevo",
            Apellidos = "Usuario"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CrearOperadorAsync(request));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("OPERADOR_DUPLICADO", ex.Codigo);
    }

    [Fact]
    public async Task CrearOperador_DocumentoDuplicado_LanzaConflictException409()
    {
        // Arrange
        var service = new FakeOperadorAdminService();
        var request = new CrearOperadorRequestDto
        {
            CodigoEmpleado = "EMP-099",
            NumeroDocumento = "1047123456", // Ya existe
            Nombres = "Otro",
            Apellidos = "Usuario"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CrearOperadorAsync(request));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("OPERADOR_DUPLICADO", ex.Codigo);
    }

    [Fact]
    public async Task CrearOperador_DatosUnicos_CreaOperadorExitosamente()
    {
        // Arrange
        var service = new FakeOperadorAdminService();
        var request = new CrearOperadorRequestDto
        {
            CodigoEmpleado = "EMP-002",
            NumeroDocumento = "1122334455",
            Nombres = "Maria",
            Apellidos = "Perez",
            Rol = "RECAUDADOR",
            Estado = "ACTIVO"
        };

        // Act
        var result = await service.CrearOperadorAsync(request);

        // Assert
        Assert.Equal(2, result.IdOperador);
        Assert.Equal("EMP-002", result.CodigoEmpleado);
        Assert.Equal("ACTIVO", result.Estado);
    }

    [Fact]
    public async Task ActualizarEstado_EstadoInvalido_LanzaAppException422()
    {
        // Arrange
        var service = new FakeOperadorAdminService();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => service.ActualizarEstadoAsync(1, "ESTADO_DESCONOCIDO"));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("ESTADO_INVALIDO", ex.Codigo);
    }

    [Fact]
    public async Task ActualizarEstado_OperadorExistente_ActualizaEstadoAInactivo()
    {
        // Arrange
        var service = new FakeOperadorAdminService();

        // Act
        var result = await service.ActualizarEstadoAsync(1, "INACTIVO");

        // Assert
        Assert.Equal("INACTIVO", result.Estado);
    }
}
