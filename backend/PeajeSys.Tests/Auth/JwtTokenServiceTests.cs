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
            secretKey: "ClaveSecretaDePruebasUnitariasJwtPeajeSys2026!*Minimo32Bytes",
            issuer: "PeajeSys.Tests",
            audience: "PeajeSys.TestClient",
            expirationHours: 8);
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
