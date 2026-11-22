using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using PeajeSys.Api.Services;
using PeajeSys.Core.Exceptions;
using Xunit;

namespace PeajeSys.Tests.Cobro;

public class TelepeajeConcurrencyTests
{
    private class CuentaTelepeajeSimulada
    {
        private readonly object _lock = new();
        public decimal Saldo { get; private set; }
        public string Estado { get; }

        public CuentaTelepeajeSimulada(decimal saldoInicial, string estado = "ACTIVA")
        {
            Saldo = saldoInicial;
            Estado = estado;
        }

        // Simula la transaccion atomica con bloqueo FOR UPDATE
        public bool IntentarDebito(decimal monto)
        {
            lock (_lock)
            {
                CobroService.ValidarCuentaTelepeaje(Estado, Saldo, monto);
                Saldo -= monto;
                return true;
            }
        }
    }

    [Fact]
    public async Task CobrosConcurrentes_SimulacionBloqueoSaldo_GarantizaConsistenciaSinSobregiro()
    {
        // Arrange
        // Saldo inicial de 30.000 COP, tarifa de 10.000 COP -> Maximo 3 cobros permitidos
        decimal saldoInicial = 30000m;
        decimal tarifa = 10000m;
        var cuenta = new CuentaTelepeajeSimulada(saldoInicial, "ACTIVA");

        int hilosConcurrentes = 10;
        var resultadosExitosos = new ConcurrentBag<bool>();
        var rechazosSaldo = new ConcurrentBag<string>();

        // Act: 10 solicitudes de cobro simultaneas sobre la misma cuenta
        var tasks = new Task[hilosConcurrentes];
        for (int i = 0; i < hilosConcurrentes; i++)
        {
            tasks[i] = Task.Run(() =>
            {
                try
                {
                    bool debitoOk = cuenta.IntentarDebito(tarifa);
                    if (debitoOk)
                    {
                        resultadosExitosos.Add(true);
                    }
                }
                catch (AppException ex) when (ex.Codigo == "SALDO_INSUFICIENTE")
                {
                    rechazosSaldo.Add(ex.Codigo);
                }
            });
        }

        await Task.WhenAll(tasks);

        // Assert
        // Exactamente 3 transacciones aprobadas
        Assert.Equal(3, resultadosExitosos.Count);
        // Exactamente 7 rechazadas por saldo insuficiente
        Assert.Equal(7, rechazosSaldo.Count);
        // Saldo remanente exactamente 0, sin balance negativo
        Assert.Equal(0m, cuenta.Saldo);
    }

    [Fact]
    public async Task CobrosConcurrentes_CuentaInactiva_RechazaTodosLosCobros()
    {
        // Arrange
        var cuentaInactiva = new CuentaTelepeajeSimulada(100000m, "SUSPENDIDA");
        decimal tarifa = 10000m;
        int hilos = 5;
        var rechazosCuenta = new ConcurrentBag<string>();

        // Act
        var tasks = new Task[hilos];
        for (int i = 0; i < hilos; i++)
        {
            tasks[i] = Task.Run(() =>
            {
                try
                {
                    cuentaInactiva.IntentarDebito(tarifa);
                }
                catch (AppException ex) when (ex.Codigo == "CUENTA_INACTIVA")
                {
                    rechazosCuenta.Add(ex.Codigo);
                }
            });
        }

        await Task.WhenAll(tasks);

        // Assert
        Assert.Equal(5, rechazosCuenta.Count);
        Assert.Equal(100000m, cuentaInactiva.Saldo);
    }
}
