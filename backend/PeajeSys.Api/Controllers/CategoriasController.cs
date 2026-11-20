using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Route("api/categorias")]
public class CategoriasController : ControllerBase
{
    private readonly ICategoriaService _categoriaService;

    public CategoriasController(ICategoriaService categoriaService)
    {
        _categoriaService = categoriaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CategoriaVehiculoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CategoriaVehiculoDto>>> ListarCategorias([FromQuery] bool? activo)
    {
        var categorias = await _categoriaService.ListarCategoriasAsync(activo);
        return Ok(categorias);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CategoriaVehiculoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoriaVehiculoDto>> ObtenerCategoriaPorId([FromRoute] int id)
    {
        var categoria = await _categoriaService.ObtenerCategoriaPorIdAsync(id);
        return Ok(categoria);
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAuth.PoliticaAdmin)]
    [ProducesResponseType(typeof(CategoriaVehiculoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CategoriaVehiculoDto>> CrearCategoria([FromBody] CrearCategoriaRequestDto request)
    {
        var creada = await _categoriaService.CrearCategoriaAsync(request);
        return StatusCode(StatusCodes.Status201Created, creada);
    }
}
