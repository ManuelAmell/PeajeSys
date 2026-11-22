using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace PeajeSys.Tests.Auth;

/// <summary>Construye tokens HS256 con cabecera y payload arbitrarios para probar la validacion.</summary>
internal static class JwtTestHelper
{
    public static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Base64Url(string texto) => Base64Url(Encoding.UTF8.GetBytes(texto));

    public static string Firmar(string sinFirma, string clave = JwtPruebas.Clave)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(clave));
        return Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(sinFirma)));
    }

    /// <summary>Si <paramref name="firma"/> es null se firma correctamente con la clave de pruebas.</summary>
    public static string Construir(object cabecera, object payload, string? firma = null)
    {
        string sinFirma = $"{Base64Url(JsonSerializer.Serialize(cabecera))}.{Base64Url(JsonSerializer.Serialize(payload))}";
        return $"{sinFirma}.{firma ?? Firmar(sinFirma)}";
    }

    public static Dictionary<string, object> CabeceraValida() =>
        new() { ["alg"] = "HS256", ["typ"] = "JWT" };

    public static Dictionary<string, object> PayloadValido(DateTimeOffset? ahora = null)
    {
        var t = ahora ?? DateTimeOffset.UtcNow;
        return new Dictionary<string, object>
        {
            ["sub"] = "7",
            ["name"] = "Ana Perez",
            ["role"] = "OPERADOR",
            ["codigo"] = "EMP-007",
            ["iss"] = JwtPruebas.Issuer,
            ["aud"] = JwtPruebas.Audience,
            ["nbf"] = t.ToUnixTimeSeconds(),
            ["exp"] = t.AddHours(1).ToUnixTimeSeconds()
        };
    }
}
