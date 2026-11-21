using System;
using System.IO;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using PeajeSys.Api.Configuration;
using PeajeSys.Api.Middlewares;
using PeajeSys.Api.Security;
using PeajeSys.Api.Services;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;
using PeajeSys.Core.Security;
using PeajeSys.Data;
using PeajeSys.Data.Repositories;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configuracion de Serilog
string logDirectory = Path.Combine(AppContext.BaseDirectory, "logs");
if (!Directory.Exists(logDirectory))
{
    Directory.CreateDirectory(logDirectory);
}

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File(
        path: Path.Combine(logDirectory, "peajesys-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14)
    .CreateLogger();

builder.Host.UseSerilog();

// Base de Datos PostgreSQL con DbContext
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=peajesys_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<PeajeSysDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    });
});

// Repositorios y Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Servicios de Seguridad y Autenticacion (BK-02)
int bcryptCost = builder.Configuration.GetValue<int>("Security:BcryptCostFactor", 12);

builder.Services.AddSingleton<IPasswordHasher>(_ => new PasswordHasher(bcryptCost));

// JWT: la clave viene de user-secrets o JwtSettings__SecretKey; sin ella la API no arranca
builder.Services.AddSingleton<IValidateOptions<JwtSettings>, JwtSettingsValidator>();
builder.Services.AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection(JwtSettings.Seccion))
    .ValidateOnStart();

builder.Services.AddSingleton<IJwtTokenService>(sp =>
{
    var jwt = sp.GetRequiredService<IOptions<JwtSettings>>().Value;
    return new JwtTokenService(jwt.SecretKey, jwt.Issuer, jwt.Audience, jwt.ExpirationHours);
});
builder.Services.AddScoped<IAuthService, AuthService>();

// Servicios de Negocio: Recaudo, Turnos y Vehiculos (BK-03)
builder.Services.AddScoped<ITurnoService, TurnoService>();
builder.Services.AddScoped<ITransaccionService, TransaccionService>();
builder.Services.AddScoped<IVehiculoService, VehiculoService>();
builder.Services.AddScoped<ICobroService, CobroService>();

// Servicios de Supervision, Arqueo, Auditoria y Monitoreo (BK-04)
builder.Services.AddScoped<IArqueoService, ArqueoService>();
builder.Services.AddScoped<IReporteRecaudoService, ReporteRecaudoService>();
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();
builder.Services.AddScoped<ITelepeajeMonitoreoService, TelepeajeMonitoreoService>();

// Servicios de Administracion, Tarifas y Personal (BK-05)
builder.Services.AddScoped<ITarifaService, TarifaService>();
builder.Services.AddScoped<IOperadorAdminService, OperadorAdminService>();
builder.Services.AddScoped<IEstacionCasetaService, EstacionCasetaService>();
builder.Services.AddScoped<ICategoriaService, CategoriaService>();

// Servicios de Integracion PL/pgSQL (BK-06)
// Funciones almacenadas: fn_obtener_tarifa_vigente, fn_validar_aptitud_telepeaje
builder.Services.AddScoped<IFnTarifaVigenteService, FnTarifaVigenteService>();
builder.Services.AddScoped<IFnValidarAptitudTelepeajeService, FnValidarAptitudTelepeajeService>();
// Procedimientos almacenados: pr_cerrar_arqueo_turno, pr_recargar_saldo_telepeaje
builder.Services.AddScoped<ISpCerrarArqueoTurnoService, SpCerrarArqueoTurnoService>();
builder.Services.AddScoped<ISpRecargarSaldoTelepeajeService, SpRecargarSaldoTelepeajeService>();

// Autenticacion y Politicas de Autorizacion (BK-02)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "Bearer";
    options.DefaultChallengeScheme = "Bearer";
})
.AddScheme<AuthenticationSchemeOptions, CustomBearerAuthenticationHandler>("Bearer", null);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(PoliticasAuth.PoliticaRecaudador, policy =>
        policy.RequireRole(Roles.Recaudador, Roles.Supervisor, Roles.Administrador));

    options.AddPolicy(PoliticasAuth.PoliticaSupervisor, policy =>
        policy.RequireRole(Roles.Supervisor, Roles.Administrador));

    options.AddPolicy(PoliticasAuth.PoliticaAdmin, policy =>
        policy.RequireRole(Roles.Administrador));
});

// Serializacion JSON snake_case y Controladores
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var campos = new Dictionary<string, string>();
        foreach (var (key, value) in context.ModelState)
        {
            if (value.Errors.Count > 0)
            {
                string rawKey = key.StartsWith("$.", StringComparison.Ordinal) ? key[2..] : key;
                string campoSnake = string.Join('.', rawKey.Split('.').Select(p => JsonNamingPolicy.SnakeCaseLower.ConvertName(p)));
                string mensajeError = !string.IsNullOrWhiteSpace(value.Errors[0].ErrorMessage)
                    ? value.Errors[0].ErrorMessage
                    : value.Errors[0].Exception?.Message ?? "Campo invalido.";
                campos[campoSnake] = mensajeError;
            }
        }

        var envelope = new PeajeSys.Core.DTOs.ErrorEnvelope
        {
            Error = new PeajeSys.Core.DTOs.ErrorDetails
            {
                Codigo = "ERROR_VALIDACION",
                Mensaje = "Los datos proporcionados contienen errores de validacion.",
                Campos = campos.Count > 0 ? campos : null
            }
        };

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(envelope);
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5180", "http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger / OpenAPI con esquema JWT Bearer
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PeajeSys API",
        Version = "v1",
        Description = "API de Recaudo y Control de Peajes PeajeSys"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Encabezado de autorizacion JWT utilizando esquema Bearer. Ejemplo: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Pipeline HTTP
app.UseSerilogRequestLogging();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PeajeSys API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseRouting();
app.UseCors("PermitirFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Endpoint Health Check
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }))
   .AllowAnonymous();

app.MapControllers();

try
{
    Log.Information("Iniciando PeajeSys API...");
    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Terminacion inesperada del host de la aplicacion");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
