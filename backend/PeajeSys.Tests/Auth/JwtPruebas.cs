namespace PeajeSys.Tests.Auth;

/// <summary>Valores de JWT exclusivos de pruebas; no son credenciales reales.</summary>
internal static class JwtPruebas
{
    public const string Clave = "ClaveExclusivaDePruebasUnitarias-NoEsUnSecretoReal-0123456789";
    public const string Issuer = "PeajeSys.Tests";
    public const string Audience = "PeajeSys.TestClient";
    public const int ExpirationHours = 8;
}
