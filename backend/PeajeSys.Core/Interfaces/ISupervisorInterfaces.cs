using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

public interface IArqueoService
{
    Task<ArqueoTurnoDto> CalcularArqueoAsync(long idTurno, decimal efectivoReportado);
}

public interface IReporteRecaudoService
{
    Task<RecaudoDiarioDto> ObtenerRecaudoDiarioAsync(int? idEstacion, string? fecha);
}

public interface IAuditoriaService
{
    Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin,
        string? tipoOperacion,
        string? usuario,
        int page = 1,
        int limit = 50);

    Task<IEnumerable<AuditoriaItemDto>> ListarAuditoriaAsync(
        string? fecha,
        string? fechaInicio,
        string? fechaFin,
        string? tipoOperacion,
        string? usuario,
        int page = 1,
        int limit = 50)
        => ListarAuditoriaAsync(
            DateTime.TryParse(fechaInicio, out var fi) ? fi : null,
            DateTime.TryParse(fechaFin, out var ff) ? ff : null,
            tipoOperacion, usuario, page, limit);
}

public interface ITelepeajeMonitoreoService
{
    Task<IEnumerable<MonitoreoCuentaTelepeajeDto>> ListarCuentasMonitoreoAsync(string? condicionSaldo, string? estado, string? q);
    Task<RecargaTagResponseDto> RecargarCuentaAsync(RecargaTagRequestDto request, string usuarioResponsable);
    Task<CuentaTelepeajeDetalleDto> ObtenerCuentaPorPlacaAsync(string placa);
}
