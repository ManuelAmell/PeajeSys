using System;
using System.Collections.Generic;

namespace PeajeSys.Core.Exceptions;

public class AppException : Exception
{
    public string Codigo { get; }
    public int StatusCode { get; }
    public IDictionary<string, string> Campos { get; }
    public string Mensaje => Message;

    public AppException(string codigo, string mensaje, int statusCode = 400, IDictionary<string, string>? campos = null)
        : base(mensaje)
    {
        Codigo = codigo;
        StatusCode = statusCode;
        Campos = campos ?? new Dictionary<string, string>();
    }
}

public class DomainException : AppException
{
    public DomainException(string codigo, string mensaje, IDictionary<string, string>? campos = null)
        : base(codigo, mensaje, 422, campos)
    {
    }
}

public class NotFoundException : AppException
{
    public NotFoundException(string codigo, string mensaje)
        : base(codigo, mensaje, 404)
    {
    }
}

public class ConflictException : AppException
{
    public ConflictException(string codigo, string mensaje)
        : base(codigo, mensaje, 409)
    {
    }
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string codigo, string mensaje)
        : base(codigo, mensaje, 401)
    {
    }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string codigo, string mensaje)
        : base(codigo, mensaje, 403)
    {
    }
}
