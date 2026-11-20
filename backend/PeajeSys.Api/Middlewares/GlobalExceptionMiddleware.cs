using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;

namespace PeajeSys.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate _next, ILogger<GlobalExceptionMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        int statusCode = StatusCodes.Status500InternalServerError;
        string codigo = "INTERNAL_SERVER_ERROR";
        string mensaje = "Ha ocurrido un error inesperado en el servidor.";
        var campos = new System.Collections.Generic.Dictionary<string, string>();

        switch (exception)
        {
            case DomainException de:
                statusCode = de.StatusCode;
                codigo = de.Codigo;
                mensaje = de.Message;
                foreach (var kvp in de.Campos) campos[kvp.Key] = kvp.Value;
                _logger.LogWarning("Regla de negocio no satisfecha: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            case NotFoundException nfe:
                statusCode = nfe.StatusCode;
                codigo = nfe.Codigo;
                mensaje = nfe.Message;
                _logger.LogWarning("Recurso no encontrado: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            case ConflictException ce:
                statusCode = ce.StatusCode;
                codigo = ce.Codigo;
                mensaje = ce.Message;
                _logger.LogWarning("Conflicto de estado: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            case UnauthorizedException ue:
                statusCode = ue.StatusCode;
                codigo = ue.Codigo;
                mensaje = ue.Message;
                _logger.LogWarning("Acceso no autorizado: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            case ForbiddenException fe:
                statusCode = fe.StatusCode;
                codigo = fe.Codigo;
                mensaje = fe.Message;
                _logger.LogWarning("Acceso prohibido: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            case AppException ae:
                statusCode = ae.StatusCode;
                codigo = ae.Codigo;
                mensaje = ae.Message;
                foreach (var kvp in ae.Campos) campos[kvp.Key] = kvp.Value;
                _logger.LogWarning("Excepcion de aplicacion: {Codigo} - {Mensaje}", codigo, mensaje);
                break;

            default:
                _logger.LogError(exception, "Excepcion no controlada: {Mensaje}", exception.Message);
                break;
        }

        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.StatusCode = statusCode;

        var envelope = new ErrorEnvelope
        {
            Error = new ErrorDetails
            {
                Codigo = codigo,
                Mensaje = mensaje,
                Campos = campos.Count > 0 ? campos : null
            }
        };

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        var json = JsonSerializer.Serialize(envelope, options);
        await context.Response.WriteAsync(json);
    }
}
