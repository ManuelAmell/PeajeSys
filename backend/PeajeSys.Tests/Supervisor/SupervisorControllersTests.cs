using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Api.Controllers;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class SupervisorControllersTests
{
    private class FakeArqueoService : IArqueoService
    {
        public Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado)
        {
            return Task.FromResult(new ArqueoTurnoDto
            {
                IdTurno = idTurno,
                IdOperador = 2,
                IdCaseta = 2,
                EfectivoSistema = 52500m,
                EfectivoReportado = efectivoReportado,
                Diferencia = efectivoReportado - 52500m,
                EstadoArqueo = efectivoReportado == 52500m ? "CUADRADO" : efectivoReportado < 52500m ? "FALTANTE" : "SOBRANTE",
                TotalVehiculos = 6
            });
        }
    }

    private class FakeReporteRecaudoService : IReporteRecaudoService
    {
        public Task<RecaudoDiarioDto> ObtenerRecaudoDiarioAsync(int? idEstacion, string? fecha)
        {
            return Task.FromResult(new RecaudoDiarioDto
            {
                IdEstacion = idEstacion ?? 1,
                Estacion = "Estacion Gambote",
                Fecha = fecha ?? "2026-10-06",
                TotalVehiculos = 142,
                TotalEfectivo = 1250000m,
                TotalTelepeaje = 850000m,
                TotalGeneral = 2100000m
            });
        }
    }

    private class FakeAuditoriaService : IAuditoriaService
    {
        public Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
            DateTime? fechaInicio,
            DateTime? fechaFin,
            string? tipoOperacion,
            string? usuario,
            int page = 1,
            int limit = 50)
        {
            var list = new List<AuditoriaItemDto>
            {
                new()
                {
                    IdAuditoria = 1,
                    TipoOperacion = tipoOperacion ?? "RECARGA_TAG",
                    UsuarioResponsable = usuario ?? "EMP-003",
                    FechaHora = DateTime.UtcNow
                }
            };
            return Task.FromResult<IEnumerable<AuditoriaItemDto>>(list);
        }
    }

    private class FakeTelepeajeMonitoreoService : ITelepeajeMonitoreoService
    {
        public Task<IEnumerable<MonitoreoCuentaTelepeajeDto>> ListarCuentasMonitoreoAsync(string? condicionSaldo, string? estado, string? q)
        {
            var list = new List<MonitoreoCuentaTelepeajeDto>
            {
                new()
                {
                    IdCuenta = 1,
                    PlacaVehiculo = "HKL123",
                    SaldoDisponible = 20000m,
                    EstadoCuenta = "ACTIVA",
                    CondicionSaldo = "SALDO SUFICIENTE"
                }
            };
            return Task.FromResult<IEnumerable<MonitoreoCuentaTelepeajeDto>>(list);
        }

        public Task<RecargaTagResponseDto> RecargarCuentaAsync(RecargaTagRequestDto request, string usuarioResponsable)
        {
            return Task.FromResult(new RecargaTagResponseDto
            {
                IdCuenta = 1,
                PlacaVehiculo = request.ObtenerPlaca(),
                TagRfidSerial = "TAG-COL-9900112233",
                SaldoAnterior = 20000m,
                SaldoNuevo = 20000m + request.ObtenerMonto(),
                MontoRecargado = request.ObtenerMonto(),
                FechaHora = DateTime.UtcNow
            });
        }
    }

    [Fact]
    public async Task TurnosController_ObtenerArqueo_Retorna200ConCalculoDeConciliacion()
    {
        // Arrange
        var controller = new TurnosController(null!, new FakeArqueoService());

        // Act
        var result = await controller.ObtenerArqueo(9, 52000m, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var arqueo = Assert.IsType<ArqueoTurnoDto>(okResult.Value);
        Assert.Equal(9, arqueo.IdTurno);
        Assert.Equal(-500m, arqueo.Diferencia);
        Assert.Equal("FALTANTE", arqueo.EstadoArqueo);
    }

    [Fact]
    public async Task RecaudoController_ObtenerRecaudoDiario_Retorna200ConTotales()
    {
        // Arrange
        var controller = new RecaudoController(null!, new FakeReporteRecaudoService());

        // Act
        var result = await controller.ObtenerRecaudoDiario(1, null, "2026-10-06");

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var recaudo = Assert.IsType<RecaudoDiarioDto>(okResult.Value);
        Assert.Equal(1, recaudo.IdEstacion);
        Assert.Equal(2100000m, recaudo.TotalGeneral);
    }

    [Fact]
    public async Task AuditoriaController_ListarAuditoria_Retorna200ConEventos()
    {
        // Arrange
        var controller = new AuditoriaController(new FakeAuditoriaService());

        // Act
        var result = await controller.ListarAuditoria(null, null, "RECARGA_TAG", null, null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<AuditoriaItemDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task TelepeajeController_ListarCuentas_Retorna200ConCuentas()
    {
        // Arrange
        var controller = new TelepeajeController(new FakeTelepeajeMonitoreoService());

        // Act
        var result = await controller.ListarCuentas(null, null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<MonitoreoCuentaTelepeajeDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task TelepeajeController_RecargarCuenta_Retorna200ConNuevoSaldo()
    {
        // Arrange
        var controller = new TelepeajeController(new FakeTelepeajeMonitoreoService());
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("codigo", "EMP-003"),
            new Claim(ClaimTypes.Role, "SUPERVISOR")
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var request = new RecargaTagRequestDto
        {
            Placa = "HKL123",
            Monto = 50000m
        };

        // Act
        var result = await controller.RecargarCuenta(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<RecargaTagResponseDto>(okResult.Value);
        Assert.Equal("HKL123", response.PlacaVehiculo);
        Assert.Equal(70000m, response.SaldoNuevo);
        Assert.Equal(50000m, response.MontoRecargado);
    }
}
