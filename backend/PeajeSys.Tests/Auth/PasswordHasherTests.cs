using PeajeSys.Core.Security;
using Xunit;

namespace PeajeSys.Tests.Auth;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher;

    public PasswordHasherTests()
    {
        _hasher = new PasswordHasher(costFactor: 12);
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

    [Fact]
    public void VerifyPassword_HashGeneradoPorPgcrypto_LoAcepta()
    {
        // Hash literal producido por PostgreSQL: crypt('Prueba2026*', gen_salt('bf', 12)).
        // Garantiza que la implementacion BCrypt propia es estandar y compatible con pgcrypto.
        const string hashPgcrypto = "$2a$12$vZSnXOz/BVv83fhz.QHV4Oxb611ibFKKZbFlZH4YtQwIOTCEh8Sya";

        Assert.True(BCryptImplementation.Verify("Prueba2026*", hashPgcrypto));
        Assert.True(_hasher.VerifyPassword("Prueba2026*", hashPgcrypto));
        Assert.False(_hasher.VerifyPassword("prueba2026*", hashPgcrypto));
    }

    [Fact]
    public void VerifyPassword_HashNuloOVacio_RetornaFalse()
    {
        Assert.False(_hasher.VerifyPassword("ClaveSegura2026*", null!));
        Assert.False(_hasher.VerifyPassword("ClaveSegura2026*", string.Empty));
    }
}
