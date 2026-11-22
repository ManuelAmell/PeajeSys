using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PeajeSys.Api.Security;
using PeajeSys.Tests.Auth;

namespace PeajeSys.Tests.Api;

/// <summary>
/// Servidor de pruebas en entorno "Testing": no carga user-secrets del equipo y la
/// configuracion JWT sale solo de JwtPruebas. No toca la base de datos.
/// </summary>
public class PeajeSysApiFactory : WebApplicationFactory<Program>
{
    protected virtual bool DefinirClave => true;

    /// <summary>
    /// Por defecto el servidor de pruebas no tiene BD de operadores: la sesion se acepta tal como la dice
    /// el token (rol incluido). Las fabricas con BD real que prueban la revocacion lo ponen en false.
    /// </summary>
    protected virtual bool SesionPermisiva => true;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        if (DefinirClave)
        {
            builder.UseSetting("JwtSettings:SecretKey", JwtPruebas.Clave);
        }
        builder.UseSetting("JwtSettings:Issuer", JwtPruebas.Issuer);
        builder.UseSetting("JwtSettings:Audience", JwtPruebas.Audience);
        builder.UseSetting("JwtSettings:ExpirationHours", JwtPruebas.ExpirationHours.ToString());

        // Corrige incompatibilidad de TestHost 8.0 con System.Text.Json en runtime 10 (PipeWriter.UnflushedBytes)
        builder.ConfigureServices(services =>
        {
            services.AddTransient<IStartupFilter, BufferResponseBodyStartupFilter>();
            if (SesionPermisiva)
            {
                services.RemoveAll<IVerificadorSesionOperador>();
                services.AddScoped<IVerificadorSesionOperador, SesionPermisivaDePruebas>();
            }
        });
    }

    private class BufferResponseBodyStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                app.Use(async (context, siguiente) =>
                {
                    var originalBody = context.Response.Body;
                    await using var mem = new MemoryStream();
                    context.Response.Body = mem;
                    try
                    {
                        await siguiente();
                    }
                    finally
                    {
                        mem.Position = 0;
                        await mem.CopyToAsync(originalBody);
                        context.Response.Body = originalBody;
                    }
                });
                next(app);
            };
        }
    }
}

/// <summary>Acepta el token tal cual (sin consultar la BD): conserva el comportamiento previo para las pruebas que no siembran operadores.</summary>
internal sealed class SesionPermisivaDePruebas : IVerificadorSesionOperador
{
    public System.Threading.Tasks.Task<System.Security.Claims.ClaimsPrincipal?> VerificarAsync(System.Security.Claims.ClaimsPrincipal desdeToken)
        => System.Threading.Tasks.Task.FromResult<System.Security.Claims.ClaimsPrincipal?>(desdeToken);

    public void Invalidar(int idOperador) { }
}

/// <summary>Variante sin JwtSettings:SecretKey para comprobar que el arranque falla.</summary>
public sealed class PeajeSysApiSinClaveFactory : PeajeSysApiFactory
{
    protected override bool DefinirClave => false;
}
