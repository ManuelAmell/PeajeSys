using System;
using System.Security.Claims;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _jwtService;

    public JwtTokenServiceTests()
    {
        _jwtService = new JwtTokenService(
            secretKey: JwtPruebas.Clave,
            issuer: JwtPruebas.Issuer,
            audience: JwtPruebas.Audience,
            expirationHours: JwtPruebas.ExpirationHours);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("clave-corta-de-31-bytes-xxxxxxx")]
    public void Constructor_ClaveInvalida_LanzaArgumentException(string? clave)
    {
        var ex = Assert.Throws<ArgumentException>(
            () => new JwtTokenService(clave!, JwtPruebas.Issuer, JwtPruebas.Audience, 8));
        if (!string.IsNullOrWhiteSpace(clave))
            Assert.DoesNotContain(clave, ex.Message);
    }

    [Theory]
    [InlineData("", "aud")]
    [InlineData("iss", "")]
    public void Constructor_IssuerOAudienceVacio_LanzaArgumentException(string issuer, string audience)
    {
        Assert.Throws<ArgumentException>(
            () => new JwtTokenService(JwtPruebas.Clave, issuer, audience, 8));
    }

    [Fact]
    public void GenerateToken_GeneraTokenFirmadoConTresSegmentos()
    {
        // Arrange
        var operador = new Operador
        {
            IdOperador = 2,
            CodigoEmpleado = "EMP-002",
            Nombres = "Maria Fernanda",
            Apellidos = "Lopez Martinez",
            Rol = Roles.Recaudador,
            Estado = EstadosOperador.Activo
        };

        // Act
        string token = _jwtService.GenerateToken(operador);

        // Assert
        Assert.NotNull(token);
        string[] partes = token.Split('.');
        Assert.Equal(3, partes.Length);
        Assert.NotEmpty(partes[0]);
        Assert.NotEmpty(partes[1]);
        Assert.NotEmpty(partes[2]);
    }

    [Fact]
    public void ValidateToken_TokenValido_RetornaPrincipalConClaimsCorrectos()
    {
        // Arrange
        var operador = new Operador
        {
            IdOperador = 4,
            CodigoEmpleado = "EMP-004",
            Nombres = "Ana Milena",
            Apellidos = "Castro Ramos",
            Rol = Roles.Recaudador,
            Estado = EstadosOperador.Activo
        };
        string token = _jwtService.GenerateToken(operador);

        // Act
        var principal = _jwtService.ValidateToken(token);

        // Assert
        Assert.NotNull(principal);
        Assert.Equal("4", principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("Ana Milena Castro Ramos", principal.FindFirst(ClaimTypes.Name)?.Value);
        Assert.Equal(Roles.Recaudador, principal.FindFirst(ClaimTypes.Role)?.Value);
        Assert.Equal("EMP-004", principal.FindFirst("codigo")?.Value);
    }

    [Fact]
    public void ValidateToken_TokenAdulterado_RetornaNull()
    {
        // Arrange
        var operador = new Operador
        {
            IdOperador = 1,
            CodigoEmpleado = "EMP-001",
            Nombres = "Carlos Alberto",
            Apellidos = "Gomez Perez",
            Rol = Roles.Recaudador,
            Estado = EstadosOperador.Activo
        };
        string token = _jwtService.GenerateToken(operador);
        string[] partes = token.Split('.');
        string tokenAdulterado = $"{partes[0]}.{partes[1]}.FirmaFalsaModificada";

        // Act
        var principal = _jwtService.ValidateToken(tokenAdulterado);

        // Assert
        Assert.Null(principal);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("invalido.token")]
    [InlineData(null)]
    public void ValidateToken_TokenInvalidoOFormatoErroneo_RetornaNull(string? tokenInvalido)
    {
        // Act
        var principal = _jwtService.ValidateToken(tokenInvalido!);

        // Assert
        Assert.Null(principal);
    }
}
