using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Enums;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Api.Controllers;

[ApiController]
[Route("api/vehiculos")]
[Authorize(Policy = PoliticasAuth.PoliticaRecaudador)]
public class VehiculosController : ControllerBase
{
    private readonly IVehiculoService _vehiculoService;

    public VehiculosController(IVehiculoService vehiculoService)
    {
        _vehiculoService = vehiculoService;
    }

    [HttpGet("{placa}")]
    [ProducesResponseType(typeof(VehiculoConsultaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorEnvelope), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehiculoConsultaDto>> ConsultarVehiculo([FromRoute] string placa)
    {
        var resultado = await _vehiculoService.ConsultarVehiculoAsync(placa);
        return Ok(resultado);
    }
}
