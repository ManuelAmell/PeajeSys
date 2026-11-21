using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;

namespace PeajeSys.Core.Interfaces;

public interface ITarifaService
{
    Task<IEnumerable<TarifaDto>> ListarTarifasAsync(int? idEstacion, int? idCategoria, bool? vigente);
    Task<TarifaDto> ObtenerTarifaVigenteAsync(int idEstacion, int idCategoria);
    Task<TarifaDto> CrearTarifaConVigenciaAsync(CrearTarifaRequestDto request, string usuarioResponsable);
    Task<TarifaDto> ActualizarTarifaAsync(int id, ActualizarTarifaRequestDto request, string usuarioResponsable);
}

public interface IOperadorAdminService
{
    Task<IEnumerable<OperadorAdminDto>> ListarOperadoresAsync(string? rol, string? estado, string? q);
    Task<OperadorAdminDto> ObtenerOperadorPorIdAsync(int id);
    Task<OperadorAdminDto> CrearOperadorAsync(CrearOperadorRequestDto request);
    Task<OperadorAdminDto> ActualizarEstadoAsync(int id, string nuevoEstado);
}

public interface IEstacionCasetaService
{
    Task<IEnumerable<EstacionDto>> ListarEstacionesAsync();
    Task<EstacionDto> ObtenerEstacionPorIdAsync(int id);
    Task<IEnumerable<CasetaDto>> ListarCasetasAsync(int? idEstacion);
    Task<CasetaDto> ObtenerCasetaPorIdAsync(int id);
    Task<CasetaDto> ActualizarEstadoCasetaAsync(int id, string nuevoEstado);
}

public interface ICategoriaService
{
    Task<IEnumerable<CategoriaVehiculoDto>> ListarCategoriasAsync(bool? activo);
    Task<CategoriaVehiculoDto> ObtenerCategoriaPorIdAsync(int id);
    Task<CategoriaVehiculoDto> CrearCategoriaAsync(CrearCategoriaRequestDto request);
    Task<CategoriaVehiculoDto> ActualizarCategoriaAsync(int id, ActualizarCategoriaRequestDto request, string usuarioResponsable);
}
