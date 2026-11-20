using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

public interface ITurnoService
{
    Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request);
    Task<CerrarTurnoResponseDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request);
    Task<TurnoDto> ObtenerTurnoAsync(long idTurno);
    Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, int? idOperador, string? estado);
}

public interface IVehiculoService
{
    Task<VehiculoConsultaDto> ConsultarVehiculoAsync(string placa);
}

public interface ICobroService
{
    Task<CobroResponseDto> ProcesarCobroAsync(CobroRequestDto request);
}
