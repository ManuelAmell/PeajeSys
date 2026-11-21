using Microsoft.Extensions.Options;
using PeajeSys.Core.Security;

namespace PeajeSys.Api.Configuration;

/// <summary>Valida JwtSettings y reporta cada error concreto de configuracion al arrancar.</summary>
public class JwtSettingsValidator : IValidateOptions<JwtSettings>
{
    public ValidateOptionsResult Validate(string? name, JwtSettings options)
    {
        var errores = options.Validar();
        return errores.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(errores);
    }
}
