using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PeajeSys.Tests.Auth;

namespace PeajeSys.Tests.Api;

/// <summary>
/// Servidor de pruebas en entorno "Testing": no carga user-secrets del equipo y la
/// configuracion JWT sale solo de JwtPruebas. No toca la base de datos.
/// </summary>
public class PeajeSysApiFactory : WebApplicationFactory<Program>
{
    protected virtual bool DefinirClave => true;

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

/// <summary>Variante sin JwtSettings:SecretKey para comprobar que el arranque falla.</summary>
public sealed class PeajeSysApiSinClaveFactory : PeajeSysApiFactory
{
    protected override bool DefinirClave => false;
}
