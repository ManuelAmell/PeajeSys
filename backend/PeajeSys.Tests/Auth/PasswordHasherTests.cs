using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher;

    public PasswordHasherTests()
    {
        _hasher = new PasswordHasher(costFactor: 12, defaultDevPassword: "Turno123*", usuariosSemillaHabilitados: true);
    }

    [Fact]
    public void HashPassword_GeneraHashValidoBCryptConCosto12()
    {
        // Arrange
        string password = "ClaveSegura2026*";

        // Act
        string hash = _hasher.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.True(hash.StartsWith("$2a$12$") || hash.StartsWith("$2b$12$"));
        Assert.True(hash.Length >= 59);
    }

    [Fact]
    public void VerifyPassword_ContrasenaCorrecta_RetornaTrue()
    {
        // Arrange
        string password = "MiPasswordValido123!";
        string hash = _hasher.HashPassword(password);

        // Act
        bool resultado = _hasher.VerifyPassword(password, hash);

        // Assert
        Assert.True(resultado);
    }

    [Fact]
    public void VerifyPassword_ContrasenaIncorrecta_RetornaFalse()
    {
        // Arrange
        string password = "ClaveOriginal123";
        string passwordErronea = "ClaveIncorrecta456";
        string hash = _hasher.HashPassword(password);

        // Act
        bool resultado = _hasher.VerifyPassword(passwordErronea, hash);

        // Assert
        Assert.False(resultado);
    }

    [Theory]
    [InlineData("EMP-001")]
    [InlineData("EMP-002")]
    [InlineData("EMP-004")]
    [InlineData("EMP-005")]
    [InlineData("ADM-001")]
    public void VerifySeedUser_UsuariosSemillaConClaveDesarrollo_RetornaTrue(string codigoEmpleado)
    {
        // Act
        bool resultado = _hasher.VerifySeedUser(codigoEmpleado, "Turno123*");

        // Assert
        Assert.True(resultado, $"El usuario semilla {codigoEmpleado} deberia validarse exitosamente con Turno123*");
    }

    [Theory]
    [InlineData("EMP-001")]
    [InlineData("EMP-002")]
    [InlineData("ADM-001")]
    public void VerifySeedUser_ClaveIncorrecta_RetornaFalse(string codigoEmpleado)
    {
        // Act
        bool resultado = _hasher.VerifySeedUser(codigoEmpleado, "ClaveInvalida999");

        // Assert
        Assert.False(resultado);
    }

    [Fact]
    public void VerifySeedUser_UsuarioNoSemilla_RetornaFalse()
    {
        // Act
        bool resultado = _hasher.VerifySeedUser("EMP-999", "Turno123*");

        // Assert
        Assert.False(resultado);
    }

    [Fact]
    public void UsuariosSemillaHabilitados_ReflejaElParametroDelConstructor()
    {
        Assert.True(_hasher.UsuariosSemillaHabilitados);
        Assert.False(CrearSinSemilla().UsuariosSemillaHabilitados);
    }

    [Theory]
    [InlineData("EMP-001")]
    [InlineData("EMP-010")]
    [InlineData("ADM-001")]
    public void VerifySeedUser_SemillaDeshabilitada_RetornaFalseConClaveDeDemo(string codigoEmpleado)
    {
        var hasher = CrearSinSemilla();

        Assert.False(hasher.VerifySeedUser(codigoEmpleado, "Turno123*"));
    }

    [Fact]
    public void HashYVerifyPassword_SemillaDeshabilitada_SiguenFuncionando()
    {
        var hasher = CrearSinSemilla();

        string hash = hasher.HashPassword("ClaveSegura2026*");

        Assert.True(hasher.VerifyPassword("ClaveSegura2026*", hash));
        Assert.False(hasher.VerifyPassword("otra", hash));
    }

    private static PasswordHasher CrearSinSemilla() =>
        new(costFactor: 4, defaultDevPassword: "Turno123*", usuariosSemillaHabilitados: false);
}
