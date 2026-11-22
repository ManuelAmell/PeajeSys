using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PeajeSys.Core.Enums;
using PeajeSys.Data;

namespace PeajeSys.Api.Security;

/// <summary>Estado y rol vigentes de un operador en la base de datos (lo unico que el handler necesita).</summary>
public sealed record SesionOperador(string Estado, string Rol);

/// <summary>
/// Comprueba que el operador de un token siga existiendo y activo, y le da el rol ACTUAL de la BD
/// en lugar del que quedo firmado en el JWT.
/// </summary>
public interface IVerificadorSesionOperador
{
    /// <summary>Devuelve el principal con el rol vigente, o null si el operador no existe o esta INACTIVO.</summary>
    Task<ClaimsPrincipal?> VerificarAsync(ClaimsPrincipal desdeToken);

    /// <summary>Descarta lo guardado en cache de ese operador; se llama al cambiar su estado o su rol.</summary>
    void Invalidar(int idOperador);
}

/// <summary>
/// Lee solo estado y rol por id (consulta indexada por la PK) y los guarda en IMemoryCache 15 s.
/// OperadorAdminService invalida la entrada al cambiar estado o rol, asi que en la misma instancia el
/// cambio es inmediato; con varias instancias del servidor el limite es la caducidad de 15 s.
/// </summary>
public sealed class VerificadorSesionOperador : IVerificadorSesionOperador
{
    internal static readonly TimeSpan Caducidad = TimeSpan.FromSeconds(15);

    private readonly PeajeSysDbContext _db;
    private readonly IMemoryCache _cache;

    public VerificadorSesionOperador(PeajeSysDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    private static string Clave(int id) => $"sesion-operador:{id}";

    public async Task<ClaimsPrincipal?> VerificarAsync(ClaimsPrincipal desdeToken)
    {
        string? sub = desdeToken.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(sub, out int id)) return null;

        if (!_cache.TryGetValue(Clave(id), out SesionOperador? sesion) || sesion == null)
        {
            sesion = await _db.Operadores.AsNoTracking()
                .Where(o => o.IdOperador == id)
                .Select(o => new SesionOperador(o.Estado, o.Rol))
                .FirstOrDefaultAsync();
            // Un operador inexistente no se guarda en cache: no hay nada que invalidar y el token ya estaba firmado.
            if (sesion == null) return null;
            _cache.Set(Clave(id), sesion, Caducidad);
        }

        if (string.Equals(sesion.Estado, EstadosOperador.Inactivo, StringComparison.OrdinalIgnoreCase)) return null;

        var identidad = new ClaimsIdentity(
            desdeToken.Claims.Where(c => c.Type != ClaimTypes.Role), "Bearer");
        identidad.AddClaim(new Claim(ClaimTypes.Role, sesion.Rol.ToUpperInvariant()));
        return new ClaimsPrincipal(identidad);
    }

    public void Invalidar(int idOperador) => _cache.Remove(Clave(idOperador));
}
