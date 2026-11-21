using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

public interface ITurnoService
{
    Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request, ActorOperacion actor);
    Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request, ActorOperacion actor);
    Task<TurnoDto> ObtenerTurnoAsync(long idTurno, ActorOperacion actor);
    Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, int? idOperador, string? estado);
    Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha = null, int? idEstacion = null)
        => ListarTurnosAsync(idCaseta, int.TryParse(operador, out var id) ? id : null, estado);
    /// <summary>Listado acotado por rol: el RECAUDADOR solo recibe sus propios turnos.</summary>
    Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha, int? idEstacion, ActorOperacion actor)
        => ListarTurnosAsync(idCaseta, operador, estado, fecha, idEstacion);
}

public interface IVehiculoService
{
    Task<VehiculoConsultaDto> ConsultarVehiculoAsync(string placa);
}

public interface ICobroService
{
    Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request);
}
