using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class AuthService : IAuthService
{
    private readonly PeajeSysDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        PeajeSysDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        string codigo = request.ObtenerCodigo();
        string password = request.ObtenerPassword();

        if (string.IsNullOrWhiteSpace(codigo))
        {
            throw new AppException("CODIGO_REQUERIDO", "El codigo de empleado es requerido.", 400);
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new AppException("CLAVE_REQUERIDA", "La contrasena es requerida.", 400);
        }

        // Buscar operador en la base de datos por codigo de empleado
        var operador = await _dbContext.Operadores
            .FirstOrDefaultAsync(o => o.CodigoEmpleado.ToUpper() == codigo.ToUpper());

        if (operador == null)
        {
            throw new NotFoundException("EMPLEADO_NO_ENCONTRADO", "Empleado no registrado en el sistema.");
        }

        // Validar estado del operador
        if (operador.Estado.Equals(EstadosOperador.Inactivo, StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenException("USUARIO_INACTIVO", "El operador se encuentra inactivo en el sistema.");
        }

        // Validar credenciales solo contra el hash BCrypt guardado en la base de datos.
        // Hash NULL (operador sin acceso) y clave incorrecta responden igual para no revelar nada.
        bool esValido = !string.IsNullOrEmpty(operador.PasswordHash)
            && _passwordHasher.VerifyPassword(password, operador.PasswordHash);

        if (!esValido)
        {
            throw new UnauthorizedException("CREDENCIALES_INVALIDAS", "Codigo de empleado o clave incorrectos.");
        }

        // Generar JWT
        string token = _jwtTokenService.GenerateToken(operador);

        // Mapear usuario DTO
        var usuarioDto = MapearUsuario(operador);

        // Verificar si el recaudador posee un turno actualmente abierto
        TurnoAbiertoDto? turnoAbiertoDto = null;
        var turnoAbierto = await _dbContext.Turnos
            .Include(t => t.Caseta)
            .ThenInclude(c => c!.Estacion)
            .FirstOrDefaultAsync(t => t.IdOperador == operador.IdOperador && t.Estado == "ABIERTO");

        if (turnoAbierto != null)
        {
            turnoAbiertoDto = new TurnoAbiertoDto
            {
                IdTurno = turnoAbierto.IdTurno,
                IdCaseta = turnoAbierto.IdCaseta,
                NumeroCarril = turnoAbierto.Caseta?.NumeroCarril ?? 1,
                TipoCarril = turnoAbierto.Caseta?.TipoCarril ?? "MANUAL",
                IdEstacion = turnoAbierto.Caseta?.IdEstacion ?? 1,
                EstacionNombre = turnoAbierto.Caseta?.Estacion?.Nombre ?? "Estacion Principal",
                Fecha = turnoAbierto.Fecha.ToString("yyyy-MM-dd"),
                Diurno = turnoAbierto.Diurno,
                FondoInicialCaja = turnoAbierto.FondoInicialCaja,
                TotalRecaudadoEfectivo = turnoAbierto.TotalRecaudadoEfectivo
            };
        }

        return new LoginResponseDto
        {
            Token = token,
            Usuario = usuarioDto,
            TurnoAbierto = turnoAbiertoDto
        };
    }

    public async Task<UsuarioDto> ObtenerSesionAsync(string identificadorOperador)
    {
        if (string.IsNullOrWhiteSpace(identificadorOperador))
        {
            throw new UnauthorizedException("NO_AUTENTICADO", "Sesion invalida o token no suministrado.");
        }

        Operador? operador = null;
        if (int.TryParse(identificadorOperador, out int idOperador))
        {
            operador = await _dbContext.Operadores.FirstOrDefaultAsync(o => o.IdOperador == idOperador);
        }

        if (operador == null)
        {
            operador = await _dbContext.Operadores
                .FirstOrDefaultAsync(o => o.CodigoEmpleado.ToUpper() == identificadorOperador.ToUpper());
        }

        if (operador == null)
        {
            throw new NotFoundException("EMPLEADO_NO_ENCONTRADO", "Operador de la sesion no encontrado.");
        }

        return MapearUsuario(operador);
    }

    public async Task LogoutAsync(string identificadorOperador)
    {
        // En una arquitectura JWT stateless se retorna HTTP 200 confirmando desconexion
        await Task.CompletedTask;
    }

    private static UsuarioDto MapearUsuario(Operador operador)
    {
        string nombreCompleto = $"{operador.Nombres} {operador.Apellidos}".Trim();
        string rolNormalizado = operador.Rol.ToUpperInvariant();

        string rolTxt = rolNormalizado switch
        {
            Roles.Supervisor => "Supervisor",
            Roles.Administrador => "Administrador",
            _ => "Recaudador"
        };

        string destino = rolNormalizado switch
        {
            Roles.Supervisor => "/supervisor",
            Roles.Administrador => "/admin",
            _ => "/operador"
        };

        string destinoTxt = rolNormalizado switch
        {
            Roles.Supervisor => "Ir al panel del supervisor",
            Roles.Administrador => "Ir al panel de administracion",
            _ => "Ir a la terminal de cobro"
        };

        return new UsuarioDto
        {
            IdOperador = operador.IdOperador,
            Id = operador.IdOperador.ToString(),
            CodigoEmpleado = operador.CodigoEmpleado,
            Codigo = operador.CodigoEmpleado,
            Nombres = operador.Nombres,
            Apellidos = operador.Apellidos,
            Nombre = operador.Nombres,
            Apellido = operador.Apellidos,
            NombreCompleto = nombreCompleto,
            Rol = rolNormalizado,
            RolTxt = rolTxt,
            Estado = operador.Estado,
            Destino = destino,
            DestinoTxt = destinoTxt
        };
    }
}
