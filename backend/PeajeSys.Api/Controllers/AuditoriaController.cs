using System;
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
[Route("api/auditoria")]
[Authorize(Policy = PoliticasAuth.PoliticaSupervisor)]
public class AuditoriaController : ControllerBase
{
    private readonly IAuditoriaService _auditoriaService;

    public AuditoriaController(IAuditoriaService auditoriaService)
    {
        _auditoriaService = auditoriaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AuditoriaItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AuditoriaItemDto>>> ListarAuditoria(
        [FromQuery] string? fecha_inicio = null,
        [FromQuery] string? fecha_fin = null,
        [FromQuery] string? tipo = null,
        [FromQuery] string? tipo_operacion = null,
        [FromQuery] string? usuario = null,
        [FromQuery] string? q = null,
        [FromQuery] string? fecha = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        string? operacionFiltro = tipo_operacion ?? tipo;
        string? usuarioFiltro = usuario ?? q;

        var items = await _auditoriaService.ListarAuditoriaAsync(fecha, fecha_inicio, fecha_fin, operacionFiltro, usuarioFiltro, page, limit);
        return Ok(items);
    }
}
