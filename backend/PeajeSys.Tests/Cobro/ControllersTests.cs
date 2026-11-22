using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Api.Controllers;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Tests.Api;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class ControllersTests
{
    // ==========================================
    // Fakes de Servicio para Pruebas Unitarias
    // ==========================================

    // Los controladores exigen estos servicios; estas pruebas no los usan.
    private class FakeArqueoServiceMinimo : IArqueoService
    {
        public Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado)
            => throw new NotSupportedException();
    }

    private class FakeReporteRecaudoServiceMinimo : IReporteRecaudoService
    {
        public Task<RecaudoDiarioDto> ObtenerRecaudoDiarioAsync(int? idEstacion, string? fecha)
            => throw new NotSupportedException();
    }

    private class FakeTurnoService : ITurnoService
    {
        public Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request, ActorOperacion actor)
        {
            if (request.IdCaseta == 99)
                throw new ConflictException("CASETA_OCUPADA", "Caseta ocupada.");

            return Task.FromResult(new AbrirTurnoResponseDto
            {
                IdTurno = 10,
                IdCaseta = request.IdCaseta,
                IdOperador = request.IdOperador,
                Fecha = "2026-03-01",
                Diurno = request.Diurno,
                FondoInicialCaja = request.FondoInicialCaja,
                Estado = "ABIERTO"
            });
        }

        public Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request, ActorOperacion actor)
        {
            if (idTurno == 99)
                throw new ConflictException("TURNO_YA_CERRADO", "Turno ya cerrado.");

            return Task.FromResult(new TurnoDto
            {
                IdTurno = idTurno,
                IdCaseta = 1,
                IdOperador = 1,
                Fecha = "2026-03-01",
                TotalRecaudadoEfectivo = 10500,
                TotalDeclaradoCierre = request.TotalDeclaradoCierre,
                DiferenciaDescuadre = request.TotalDeclaradoCierre - 10500,
                Estado = "CERRADO"
            });
        }

        public Task<TurnoDto> ObtenerTurnoAsync(long idTurno, ActorOperacion actor)
        {
            if (idTurno == 999)
                throw new NotFoundException("TURNO_NO_ENCONTRADO", "Turno no encontrado.");

            return Task.FromResult(new TurnoDto
            {
                IdTurno = idTurno,
                IdCaseta = 1,
                IdOperador = 1,
                Fecha = "2026-03-01",
                Estado = "ABIERTO"
            });
        }

        public Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, ActorOperacion actor)
        {
            var list = new List<TurnoDto>
            {
                new() { IdTurno = 1, IdCaseta = 1, IdOperador = 1, Estado = "ABIERTO" },
                new() { IdTurno = 2, IdCaseta = 2, IdOperador = 2, Estado = "CERRADO" }
            };
            return Task.FromResult<IEnumerable<TurnoDto>>(list);
        }
    }

    private class FakeVehiculoService : IVehiculoService
    {
        public Task<VehiculoConsultaDto> ConsultarVehiculoAsync(string placa)
        {
            string norm = (placa ?? "").ToUpperInvariant().Replace(" ", "");

            if (norm == "HKL123")
            {
                return Task.FromResult(new VehiculoConsultaDto
                {
                    Placa = norm,
                    Encontrado = true,
                    IdCategoria = 1,
                    CategoriaCodigo = "CAT_I",
                    CategoriaDescripcion = "Automoviles",
                    TieneTag = true,
                    TagRfidSerial = "TAG-COL-9900112233",
                    EstadoCuenta = "ACTIVA",
                    SaldoDisponible = 150000m
                });
            }

            // Vehiculo no registrado: lanza NotFoundException con codigo VEHICULO_NO_ENCONTRADO
            throw new NotFoundException("VEHICULO_NO_ENCONTRADO", $"Vehiculo con placa {norm} no encontrado en el sistema.");
        }
    }

    private class FakeCobroService : ICobroService
    {
        public Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request, ActorOperacion actor)
        {
            if (request.IdTurno == 99)
                throw new ConflictException("TURNO_CERRADO", "El turno indicado no esta ABIERTO.");

            decimal tarifa = 10500m;
            decimal recibido = request.ObtenerEfectivoRecibido();

            if (request.MetodoPago == "EFECTIVO" && recibido < tarifa)
                throw new AppException("EFECTIVO_INSUFICIENTE", "Efectivo insuficiente.", 422);

            return Task.FromResult(new CobroResponseDto
            {
                IdTransaccion = 501,
                NumeroTicket = "TCK-20260301-00501",
                Placa = request.ObtenerPlaca(),
                IdCategoria = request.IdCategoria,
                MontoTarifa = tarifa,
                MetodoPago = request.MetodoPago,
                EfectivoRecibido = request.MetodoPago == "EFECTIVO" ? recibido : null,
                Cambio = request.MetodoPago == "EFECTIVO" ? recibido - tarifa : null,
                EstadoPaso = "APROBADO",
                FechaHora = DateTime.UtcNow
            });
        }
    }

    // ==========================================
    // Pruebas de TurnosController
    // ==========================================

    [Fact]
    public async Task TurnosController_AbrirTurno_Retorna201ConDatosDeTurno()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService(), new FakeArqueoServiceMinimo()).ConUsuario(2, "RECAUDADOR");
        var request = new AbrirTurnoRequestDto { IdCaseta = 2, IdOperador = 2, FondoInicialCaja = 100000 };

        // Act
        var result = await controller.AbrirTurno(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);
        var response = Assert.IsType<AbrirTurnoResponseDto>(statusResult.Value);
        Assert.Equal(10, response.IdTurno);
        Assert.Equal("ABIERTO", response.Estado);
    }

    [Fact]
    public async Task TurnosController_CerrarTurno_Retorna200ConResumen()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService(), new FakeArqueoServiceMinimo()).ConUsuario(2, "RECAUDADOR");
        var request = new CerrarTurnoRequestDto { TotalDeclaradoCierre = 10000 };

        // Act
        var result = await controller.CerrarTurno(1, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(200, okResult.StatusCode);
        var response = Assert.IsType<TurnoDto>(okResult.Value);
        Assert.Equal("CERRADO", response.Estado);
        Assert.Equal(-500, response.DiferenciaDescuadre);
    }

    [Fact]
    public async Task TurnosController_ListarTurnos_Retorna200ConLista()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService(), new FakeArqueoServiceMinimo()).ConUsuario(2, "RECAUDADOR");

        // Act
        var result = await controller.ListarTurnos(null, null, null, null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<TurnoDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task TurnosController_ObtenerTurnoPorId_Retorna200ConTurno()
    {
        // Arrange
        var controller = new TurnosController(new FakeTurnoService(), new FakeArqueoServiceMinimo()).ConUsuario(2, "RECAUDADOR");

        // Act
        var result = await controller.ObtenerTurnoPorId(1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var turno = Assert.IsType<TurnoDto>(okResult.Value);
        Assert.Equal(1, turno.IdTurno);
    }

    // ==========================================
    // Pruebas de VehiculosController
    // ==========================================

    [Fact]
    public async Task VehiculosController_ConsultarVehiculoConTag_Retorna200ConDatosYCuenta()
    {
        // Arrange
        var controller = new VehiculosController(new FakeVehiculoService());

        // Act
        var result = await controller.ConsultarVehiculo("hkl 123");

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var vehiculo = Assert.IsType<VehiculoConsultaDto>(okResult.Value);
        Assert.Equal("HKL123", vehiculo.Placa);
        Assert.True(vehiculo.Encontrado);
        Assert.True(vehiculo.TieneTag);
        Assert.Equal("ACTIVA", vehiculo.EstadoCuenta);
        Assert.Equal(150000m, vehiculo.SaldoDisponible);
    }

    [Fact]
    public async Task VehiculosController_ConsultarVehiculoNoRegistrado_LanzaNotFoundException()
    {
        // Arrange
        var controller = new VehiculosController(new FakeVehiculoService());

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => controller.ConsultarVehiculo("XYZ999"));
        Assert.Equal("VEHICULO_NO_ENCONTRADO", ex.Codigo);
        Assert.Equal(404, ex.StatusCode);
    }

    // ==========================================
    // Pruebas de RecaudoController
    // ==========================================

    [Fact]
    public async Task RecaudoController_CobroEfectivoValido_Retorna201ConTransaccionYCambio()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService(), new FakeReporteRecaudoServiceMinimo()).ConUsuario(1, "RECAUDADOR");
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "UYT890",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 20000m
        };

        // Act
        var result = await controller.ProcesarCobro(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, statusResult.StatusCode);
        var response = Assert.IsType<CobroResponseDto>(statusResult.Value);
        Assert.Equal("TCK-20260301-00501", response.NumeroTicket);
        Assert.Equal(10500m, response.MontoTarifa);
        Assert.Equal(9500m, response.Cambio);
        Assert.Equal("APROBADO", response.EstadoPaso);
    }

    [Fact]
    public async Task RecaudoController_CobroEnTurnoCerrado_LanzaConflictExceptionTurnoCerrado()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService(), new FakeReporteRecaudoServiceMinimo()).ConUsuario(1, "RECAUDADOR");
        var request = new CobroRequestDto
        {
            IdTurno = 99, // Turno 99 simula estar cerrado
            Placa = "UYT890",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 20000m
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => controller.ProcesarCobro(request));
        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("TURNO_CERRADO", ex.Codigo);
    }

    [Fact]
    public async Task RecaudoController_EfectivoInsuficiente_LanzaAppException422()
    {
        // Arrange
        var controller = new RecaudoController(new FakeCobroService(), new FakeReporteRecaudoServiceMinimo()).ConUsuario(1, "RECAUDADOR");
        var request = new CobroRequestDto
        {
            IdTurno = 1,
            Placa = "UYT890",
            IdCategoria = 1,
            MetodoPago = "EFECTIVO",
            EfectivoRecibido = 5000m // Menor que la tarifa de 10.500
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => controller.ProcesarCobro(request));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("EFECTIVO_INSUFICIENTE", ex.Codigo);
    }
}
