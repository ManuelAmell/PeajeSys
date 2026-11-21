using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace PeajeSys.Tests.Api;

/// <summary>
/// Las pruebas unitarias construyen los controladores a mano y no detectan que el contenedor
/// de DI no pueda activarlos (p. ej. por tener varios constructores publicos).
/// </summary>
public class ActivacionControladoresTests : IClassFixture<PeajeSysApiFactory>
{
    private readonly PeajeSysApiFactory _fabrica;

    public ActivacionControladoresTests(PeajeSysApiFactory fabrica)
    {
        _fabrica = fabrica;
    }

    private static IEnumerable<Type> TiposControlador() =>
        typeof(Program).Assembly.GetTypes()
            .Where(t => t.IsPublic && !t.IsAbstract && typeof(ControllerBase).IsAssignableFrom(t))
            .OrderBy(t => t.Name);

    public static IEnumerable<object[]> NombresControladores() =>
        TiposControlador().Select(t => new object[] { t.Name });

    [Theory]
    [MemberData(nameof(NombresControladores))]
    public void Controlador_se_puede_activar_desde_el_contenedor(string nombre)
    {
        var tipo = TiposControlador().Single(t => t.Name == nombre);
        using var scope = _fabrica.Services.CreateScope();

        var instancia = ActivatorUtilities.CreateInstance(scope.ServiceProvider, tipo);

        Assert.IsType(tipo, instancia);
    }
}
