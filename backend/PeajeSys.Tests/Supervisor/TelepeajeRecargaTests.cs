using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class TelepeajeRecargaTests
{
    private class CuentaSimulada
    {
        public long IdCuenta { get; set; }
        public string PlacaVehiculo { get; set; } = string.Empty;
        public string TagRfidSerial { get; set; } = string.Empty;
        public decimal SaldoDisponible { get; set; }
        public string EstadoCuenta { get; set; } = "ACTIVA";
    }

    private class FakeTelepeajeMonitoreoService : ITelepeajeMonitoreoService
    {
        private readonly Dictionary<string, CuentaSimulada> _cuentasPorPlaca = new();
        public List<string> EventosAuditoria { get; } = new();

        public FakeTelepeajeMonitoreoService()
        {
            var cuenta1 = new CuentaSimulada
            {
                IdCuenta = 1,
                PlacaVehiculo = "HKL123",
                TagRfidSerial = "TAG-COL-9900112233",
                SaldoDisponible = 20000m,
                EstadoCuenta = "ACTIVA"
            };

            var cuenta2 = new CuentaSimulada
            {
                IdCuenta = 2,
                PlacaVehiculo = "XYZ789",
                TagRfidSerial = "TAG-COL-1122334455",
                SaldoDisponible = 0m,
                EstadoCuenta = "ACTIVA"
            };

            var cuenta3 = new CuentaSimulada
            {
                IdCuenta = 3,
                PlacaVehiculo = "BBB456",
                TagRfidSerial = "TAG-COL-5566778899",
                SaldoDisponible = 15000m,
                EstadoCuenta = "SUSPENDIDA"
            };

            _cuentasPorPlaca[cuenta1.PlacaVehiculo] = cuenta1;
            _cuentasPorPlaca[cuenta2.PlacaVehiculo] = cuenta2;
            _cuentasPorPlaca[cuenta3.PlacaVehiculo] = cuenta3;
        }

        public Task<IEnumerable<MonitoreoCuentaTelepeajeDto>> ListarCuentasMonitoreoAsync(string? condicionSaldo, string? estado, string? q)
        {
            var list = new List<MonitoreoCuentaTelepeajeDto>();
            foreach (var c in _cuentasPorPlaca.Values)
            {
                string condicion = c.SaldoDisponible == 0
                    ? "SIN SALDO"
                    : c.SaldoDisponible < 20000
                        ? "SALDO CRITICO"
                        : "SALDO SUFICIENTE";

                if (!string.IsNullOrWhiteSpace(condicionSaldo) && !condicion.Equals(condicionSaldo, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrWhiteSpace(estado) && !c.EstadoCuenta.Equals(estado, StringComparison.OrdinalIgnoreCase))
                    continue;

                list.Add(new MonitoreoCuentaTelepeajeDto
                {
                    IdCuenta = c.IdCuenta,
                    PlacaVehiculo = c.PlacaVehiculo,
                    CategoriaVehiculo = "CAT_I",
                    TagRfidSerial = c.TagRfidSerial,
                    SaldoDisponible = c.SaldoDisponible,
                    EstadoCuenta = c.EstadoCuenta,
                    CondicionSaldo = condicion
                });
            }

            return Task.FromResult<IEnumerable<MonitoreoCuentaTelepeajeDto>>(list);
        }

        public Task<RecargaTagResponseDto> RecargarCuentaAsync(RecargaTagRequestDto request, string usuarioResponsable)
        {
            decimal monto = request.ObtenerMonto();
            if (monto <= 0)
                throw new AppException("MONTO_INVALIDO", "El monto debe ser mayor a cero.", 422);

            string placa = request.ObtenerPlaca();
            string tag = request.ObtenerSerialTag();

            CuentaSimulada? cuenta = null;
            if (!string.IsNullOrWhiteSpace(placa) && _cuentasPorPlaca.TryGetValue(placa, out var c1))
                cuenta = c1;

            if (cuenta == null && !string.IsNullOrWhiteSpace(tag))
            {
                foreach (var c in _cuentasPorPlaca.Values)
                {
                    if (c.TagRfidSerial.Equals(tag, StringComparison.OrdinalIgnoreCase))
                    {
                        cuenta = c;
                        break;
                    }
                }
            }

            if (cuenta == null)
                throw new NotFoundException("CUENTA_NO_ENCONTRADA", "Cuenta no encontrada.");

            decimal saldoAnterior = cuenta.SaldoDisponible;
            cuenta.SaldoDisponible += monto;
            decimal saldoNuevo = cuenta.SaldoDisponible;

            EventosAuditoria.Add($"RECARGA_TAG: {cuenta.PlacaVehiculo} por {monto} por {usuarioResponsable}");

            return Task.FromResult(new RecargaTagResponseDto
            {
                IdCuenta = cuenta.IdCuenta,
                PlacaVehiculo = cuenta.PlacaVehiculo,
                TagRfidSerial = cuenta.TagRfidSerial,
                SaldoAnterior = saldoAnterior,
                SaldoNuevo = saldoNuevo,
                MontoRecargado = monto,
                FechaHora = DateTime.UtcNow
            });
        }

        public Task<CuentaTelepeajeDetalleDto> ObtenerCuentaPorPlacaAsync(string placa)
        {
            throw new NotImplementedException();
        }
    }

    [Fact]
    public async Task RecargarCuenta_MontoValidoPorPlaca_IncrementaSaldoYRegistraAuditoria()
    {
        // Arrange
        var service = new FakeTelepeajeMonitoreoService();
        var request = new RecargaTagRequestDto
        {
            Placa = "HKL123",
            Monto = 50000m
        };

        // Act
        var result = await service.RecargarCuentaAsync(request, "EMP-003");

        // Assert
        Assert.Equal(1, result.IdCuenta);
        Assert.Equal("HKL123", result.PlacaVehiculo);
        Assert.Equal(20000m, result.SaldoAnterior);
        Assert.Equal(70000m, result.SaldoNuevo);
        Assert.Equal(50000m, result.MontoRecargado);
        Assert.Single(service.EventosAuditoria);
        Assert.Contains("RECARGA_TAG", service.EventosAuditoria[0]);
    }

    [Fact]
    public async Task RecargarCuenta_PorSerialTag_EncuentraCuentaYRecarga()
    {
        // Arrange
        var service = new FakeTelepeajeMonitoreoService();
        var request = new RecargaTagRequestDto
        {
            TagRfidSerial = "TAG-COL-1122334455",
            Monto = 30000m
        };

        // Act
        var result = await service.RecargarCuentaAsync(request, "EMP-003");

        // Assert
        Assert.Equal("XYZ789", result.PlacaVehiculo);
        Assert.Equal(0m, result.SaldoAnterior);
        Assert.Equal(30000m, result.SaldoNuevo);
    }

    [Fact]
    public async Task RecargarCuenta_MontoCeroONegativo_LanzaAppException422MontoInvalido()
    {
        // Arrange
        var service = new FakeTelepeajeMonitoreoService();
        var request = new RecargaTagRequestDto { Placa = "HKL123", Monto = 0m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AppException>(() => service.RecargarCuentaAsync(request, "EMP-003"));
        Assert.Equal(422, ex.StatusCode);
        Assert.Equal("MONTO_INVALIDO", ex.Codigo);
    }

    [Fact]
    public async Task RecargarCuenta_CuentaNoExistente_LanzaNotFoundException404()
    {
        // Arrange
        var service = new FakeTelepeajeMonitoreoService();
        var request = new RecargaTagRequestDto { Placa = "NOEXISTE", Monto = 25000m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => service.RecargarCuentaAsync(request, "EMP-003"));
        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("CUENTA_NO_ENCONTRADA", ex.Codigo);
    }

    [Fact]
    public async Task ListarCuentasMonitoreo_FiltroCondicionSaldo_RetornaSoloCuentasSinSaldo()
    {
        // Arrange
        var service = new FakeTelepeajeMonitoreoService();

        // Act
        var result = await service.ListarCuentasMonitoreoAsync("SIN SALDO", null, null);

        // Assert
        var lista = Assert.IsAssignableFrom<IEnumerable<MonitoreoCuentaTelepeajeDto>>(result);
        Assert.All(lista, c => Assert.Equal("SIN SALDO", c.CondicionSaldo));
    }
}
