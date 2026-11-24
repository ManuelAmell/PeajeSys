using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PeajeSys.Api.Configuration;
using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class JwtSettingsTests
{
    private static JwtSettings Valida() => new()
    {
        SecretKey = JwtPruebas.Clave,
        Issuer = JwtPruebas.Issuer,
        Audience = JwtPruebas.Audience,
        ExpirationHours = JwtPruebas.ExpirationHours
    };

    [Fact]
    public void Seccion_EsJwtSettings() => Assert.Equal("JwtSettings", JwtSettings.Seccion);

    [Fact]
    public void Validar_ConfiguracionValida_SinErrores()
        => Assert.Empty(Valida().Validar());

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validar_ClaveNulaOVacia_DevuelveError(string? clave)
    {
        var s = Valida();
        s.SecretKey = clave!;
        Assert.Single(s.Validar());
    }

    [Fact]
    public void Validar_Clave31Bytes_DevuelveError()
    {
        var s = Valida();
        s.SecretKey = new string('a', 31);
        Assert.Single(s.Validar());
    }

    [Fact]
    public void Validar_Clave32Bytes_EsValida()
    {
        var s = Valida();
        s.SecretKey = new string('a', 32);
        Assert.Empty(s.Validar());
    }

    [Fact]
    public void Validar_MideBytesUtf8YNoCaracteres()
    {
        var s = Valida();
        // 16 caracteres de 2 bytes = 32 bytes: vale aunque tenga solo 16 caracteres.
        s.SecretKey = new string('ñ', 16);
        Assert.Empty(s.Validar());
        // 15 caracteres de 2 bytes = 30 bytes: no vale.
        s.SecretKey = new string('ñ', 15);
        Assert.Single(s.Validar());
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Validar_IssuerVacio_DevuelveError(string issuer)
    {
        var s = Valida();
        s.Issuer = issuer;
        Assert.Single(s.Validar());
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Validar_AudienceVacio_DevuelveError(string audience)
    {
        var s = Valida();
        s.Audience = audience;
        Assert.Single(s.Validar());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Validar_ExpiracionNoPositiva_DevuelveError(int horas)
    {
        var s = Valida();
        s.ExpirationHours = horas;
        Assert.Single(s.Validar());
    }

    [Fact]
    public void Validar_NingunMensajeContieneLaClave()
    {
        var s = new JwtSettings { SecretKey = "corta-secreta-xyz", Issuer = "", Audience = "", ExpirationHours = 0 };
        var errores = s.Validar();
        Assert.True(errores.Count >= 4);
        Assert.All(errores, e => Assert.DoesNotContain("corta-secreta-xyz", e));
    }

    [Fact]
    public void ValidateOnStart_ConfiguracionInvalida_LanzaOptionsValidationException()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IValidateOptions<JwtSettings>, JwtSettingsValidator>();
        services.AddOptions<JwtSettings>()
            .Configure(o => o.SecretKey = "corta")
            .ValidateOnStart();
        using var provider = services.BuildServiceProvider();

        var ex = Assert.Throws<OptionsValidationException>(
            () => provider.GetRequiredService<IOptions<JwtSettings>>().Value);
        Assert.Contains(ex.Failures, f => f.Contains("SecretKey"));
        Assert.DoesNotContain(ex.Failures, f => f.Contains("corta\""));
    }

    [Fact]
    public void ValidateOnStart_ConfiguracionValida_ResuelveOpciones()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IValidateOptions<JwtSettings>, JwtSettingsValidator>();
        services.AddOptions<JwtSettings>()
            .Configure(o =>
            {
                o.SecretKey = JwtPruebas.Clave;
                o.Issuer = JwtPruebas.Issuer;
                o.Audience = JwtPruebas.Audience;
                o.ExpirationHours = 1;
            })
            .ValidateOnStart();
        using var provider = services.BuildServiceProvider();
        Assert.Equal(JwtPruebas.Issuer, provider.GetRequiredService<IOptions<JwtSettings>>().Value.Issuer);
    }
}
