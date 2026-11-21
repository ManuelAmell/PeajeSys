using System;
using System.Collections.Generic;
using System.Linq;
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
    private readonly TimeProvider _timeProvider;

    private const int MargenRelojSegundos = 30;

    public JwtTokenService(string secretKey, string issuer, string audience, int expirationHours,
        TimeProvider? timeProvider = null)
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

        if (expirationHours <= 0)
            throw new ArgumentException("La expiracion del JWT debe ser mayor que cero horas.", nameof(expirationHours));

        _secretKey = secretKey;
        _issuer = issuer;
        _audience = audience;
        _expiration = TimeSpan.FromHours(expirationHours);
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public string GenerateToken(Operador operador)
    {
        var now = _timeProvider.GetUtcNow();
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
        if (parts.Length != 3 || parts.Any(string.IsNullOrEmpty)) return null;

        try
        {
            using var header = JsonDocument.Parse(Base64UrlDecode(parts[0]));
            if (!CabeceraValida(header.RootElement)) return null;

            if (!FirmaValida(parts[0], parts[1], parts[2])) return null;

            using var payload = JsonDocument.Parse(Base64UrlDecode(parts[1]));
            var root = payload.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;
            if (!ValidarTiempos(root) || !ValidarEmisorYAudiencia(root)) return null;

            return ConstruirPrincipal(root);
        }
        catch (Exception ex) when (ex is FormatException or JsonException or InvalidOperationException
            or ArgumentException or OverflowException)
        {
            // El handler de autenticacion registra el fallo al recibir null.
            return null;
        }
    }

    private static bool CabeceraValida(JsonElement cabecera)
    {
        if (cabecera.ValueKind != JsonValueKind.Object) return false;
        if (!cabecera.TryGetProperty("alg", out var alg)
            || alg.ValueKind != JsonValueKind.String
            || alg.GetString() != "HS256") return false;
        if (cabecera.TryGetProperty("typ", out var typ)
            && (typ.ValueKind != JsonValueKind.String || typ.GetString() != "JWT")) return false;
        return true;
    }

    private bool FirmaValida(string cabeceraB64, string payloadB64, string firmaB64)
    {
        byte[] recibida = Base64UrlDecode(firmaB64);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey));
        byte[] esperada = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{cabeceraB64}.{payloadB64}"));
        return CryptographicOperations.FixedTimeEquals(recibida, esperada);
    }

    private bool ValidarTiempos(JsonElement root)
    {
        long ahora = _timeProvider.GetUtcNow().ToUnixTimeSeconds();

        if (!root.TryGetProperty("exp", out var exp) || exp.ValueKind != JsonValueKind.Number) return false;
        if (ahora > exp.GetInt64() + MargenRelojSegundos) return false;

        if (root.TryGetProperty("nbf", out var nbf))
        {
            if (nbf.ValueKind != JsonValueKind.Number) return false;
            if (ahora + MargenRelojSegundos < nbf.GetInt64()) return false;
        }
        return true;
    }

    private bool ValidarEmisorYAudiencia(JsonElement root)
    {
        if (!root.TryGetProperty("iss", out var iss)
            || iss.ValueKind != JsonValueKind.String
            || !string.Equals(iss.GetString(), _issuer, StringComparison.Ordinal)) return false;

        if (!root.TryGetProperty("aud", out var aud)) return false;
        return aud.ValueKind switch
        {
            JsonValueKind.String => string.Equals(aud.GetString(), _audience, StringComparison.Ordinal),
            JsonValueKind.Array => aud.EnumerateArray().Any(a =>
                a.ValueKind == JsonValueKind.String
                && string.Equals(a.GetString(), _audience, StringComparison.Ordinal)),
            _ => false
        };
    }

    private static ClaimsPrincipal ConstruirPrincipal(JsonElement root)
    {
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

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
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
}
