using System.Linq;
using System.Reflection;
using PeajeSys.Api.Services;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Turnos;

/// <summary>Ninguna sobrecarga de ListarTurnosAsync puede omitir el actor: evita reabrir la fuga de turnos ajenos.</summary>
public class SobrecargaSinActorTests
{
    [Theory]
    [InlineData(typeof(ITurnoService))]
    [InlineData(typeof(TurnoService))]
    public void ListarTurnosAsync_SoloExisteConActorOperacion(System.Type tipo)
    {
        var sobrecargas = tipo.GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.Name == "ListarTurnosAsync").ToList();

        Assert.NotEmpty(sobrecargas);
        Assert.All(sobrecargas, m =>
            Assert.Contains(m.GetParameters(), p => p.ParameterType == typeof(ActorOperacion)));
    }
}
