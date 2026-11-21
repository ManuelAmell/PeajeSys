using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Core.Security;

public class JwtTokenService : IJwtTokenService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly TimeSpan _expiration;

    public JwtTokenService(string secretKey, string issuer, string audience, int expirationHours)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            throw new ArgumentException("La clave JWT es obligatoria.", nameof(secretKey));
        if (Encoding.UTF8.GetByteCount(secretKey) < JwtSettings.LongitudMinimaClaveBytes)
            throw new ArgumentException(
                $"La clave JWT debe tener al menos {JwtSettings.LongitudMinimaClaveBytes} bytes en UTF-8.", nameof(secretKey));
        if (string.IsNullOrWhiteSpace(issuer))
            throw new ArgumentException("El issuer JWT es obligatorio.", nameof(issuer));
        if (string.IsNullOrWhiteSpace(audience))
            throw new ArgumentException("El audience JWT es obligatorio.", nameof(audience));

        _secretKey = secretKey;
        _issuer = issuer;
        _audience = audience;
        _expiration = TimeSpan.FromHours(expirationHours);
    }

    public string GenerateToken(string codigoEmpleado, string idOperador, string nombre, string rol, string? casetaId = null)
    {
        int.TryParse(idOperador, out int idOp);
        return GenerateToken(new Operador
        {
            IdOperador = idOp,
            CodigoEmpleado = codigoEmpleado,
            Nombres = nombre,
            Apellidos = string.Empty,
            Rol = rol
        });
    }

    public string GenerateToken(Operador operador)
    {
        var now = DateTimeOffset.UtcNow;
        var exp = now.Add(_expiration);

        var header = new Dictionary<string, object>
        {
            { "alg", "HS256" },
            { "typ", "JWT" }
        };

        string nombreCompleto = $"{operador.Nombres} {operador.Apellidos}".Trim();
        var payload = new Dictionary<string, object>
        {
            { "sub", operador.IdOperador.ToString() },
            { "nameid", operador.IdOperador.ToString() },
            { "unique_name", operador.CodigoEmpleado },
            { "name", nombreCompleto },
            { "role", operador.Rol },
            { "codigo", operador.CodigoEmpleado },
            { "iss", _issuer },
            { "aud", _audience },
            { "nbf", now.ToUnixTimeSeconds() },
            { "iat", now.ToUnixTimeSeconds() },
            { "exp", exp.ToUnixTimeSeconds() }
        };

        string headerJson = JsonSerializer.Serialize(header);
        string payloadJson = JsonSerializer.Serialize(payload);

        string headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        string payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

        string unsignedToken = $"{headerBase64}.{payloadBase64}";
        byte[] signatureBytes;
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey)))
        {
            signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken));
        }

        string signatureBase64 = Base64UrlEncode(signatureBytes);
        return $"{unsignedToken}.{signatureBase64}";
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        string[] parts = token.Trim().Split('.');
        if (parts.Length != 3) return null;

        string unsignedToken = $"{parts[0]}.{parts[1]}";
        byte[] expectedSig;
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey)))
        {
            expectedSig = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken));
        }

        string expectedSigBase64 = Base64UrlEncode(expectedSig);
        if (!CryptographicEquals(parts[2], expectedSigBase64))
        {
            return null;
        }

        try
        {
            byte[] payloadBytes = Base64UrlDecode(parts[1]);
            string payloadJson = Encoding.UTF8.GetString(payloadBytes);
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("exp", out var expElement))
            {
                long expSeconds = expElement.GetInt64();
                if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expSeconds)
                {
                    return null;
                }
            }

            var claims = new List<Claim>();
            if (root.TryGetProperty("sub", out var subEl))
                claims.Add(new Claim(ClaimTypes.NameIdentifier, subEl.GetString() ?? string.Empty));
            if (root.TryGetProperty("name", out var nameEl))
                claims.Add(new Claim(ClaimTypes.Name, nameEl.GetString() ?? string.Empty));
            if (root.TryGetProperty("role", out var roleEl))
                claims.Add(new Claim(ClaimTypes.Role, roleEl.GetString() ?? string.Empty));
            if (root.TryGetProperty("codigo", out var codEl))
            {
                claims.Add(new Claim("codigo", codEl.GetString() ?? string.Empty));
                claims.Add(new Claim("codigo_empleado", codEl.GetString() ?? string.Empty));
            }

            var identity = new ClaimsIdentity(claims, "Bearer");
            return new ClaimsPrincipal(identity);
        }
        catch
        {
            return null;
        }
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    private static byte[] Base64UrlDecode(string input)
    {
        string output = input.Replace("-", "+").Replace("_", "/");
        switch (output.Length % 4)
        {
            case 2: output += "=="; break;
            case 3: output += "="; break;
        }
        return Convert.FromBase64String(output);
    }

    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        int result = 0;
        for (int i = 0; i < a.Length; i++)
        {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }
}
