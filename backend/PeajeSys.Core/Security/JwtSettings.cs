using System.Text;

namespace PeajeSys.Core.Security;

/// <summary>Configuracion del JWT. La clave nunca debe versionarse (user-secrets o JwtSettings__SecretKey).</summary>
public class JwtSettings
{
    public const string Seccion = "JwtSettings";
    public const int LongitudMinimaClaveBytes = 32;

    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationHours { get; set; }

    /// <summary>Devuelve los errores de configuracion; los mensajes nunca incluyen el valor de la clave.</summary>
    public IReadOnlyList<string> Validar()
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(SecretKey))
            errores.Add($"{Seccion}:SecretKey no esta configurada. Definala con user-secrets o la variable de entorno {Seccion}__SecretKey.");
        else if (Encoding.UTF8.GetByteCount(SecretKey) < LongitudMinimaClaveBytes)
            errores.Add($"{Seccion}:SecretKey debe tener al menos {LongitudMinimaClaveBytes} bytes en UTF-8.");

        if (string.IsNullOrWhiteSpace(Issuer))
            errores.Add($"{Seccion}:Issuer no puede estar vacio.");
        if (string.IsNullOrWhiteSpace(Audience))
            errores.Add($"{Seccion}:Audience no puede estar vacio.");
        if (ExpirationHours <= 0)
            errores.Add($"{Seccion}:ExpirationHours debe ser mayor que cero.");

        return errores;
    }
}
