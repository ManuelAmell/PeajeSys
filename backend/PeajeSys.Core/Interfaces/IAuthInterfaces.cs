using System.Security.Claims;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;

namespace PeajeSys.Core.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    bool VerifySeedUser(string codigoEmpleado, string password);
}

public interface IJwtTokenService
{
    string GenerateToken(Operador operador);
    string GenerateToken(string codigoEmpleado, string idOperador, string nombre, string rol, string? casetaId = null);
    ClaimsPrincipal? ValidateToken(string token);
}

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
    Task<UsuarioDto> ObtenerSesionAsync(string identificadorOperador);
    Task LogoutAsync(string identificadorOperador);
}
