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
        [FromQuery] DateTime? fecha_inicio,
        [FromQuery] DateTime? fecha_fin,
        [FromQuery] string? tipo,
        [FromQuery] string? tipo_operacion,
        [FromQuery] string? usuario,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        string? operacionFiltro = tipo_operacion ?? tipo;
        string? usuarioFiltro = usuario ?? q;

        var items = await _auditoriaService.ListarAuditoriaAsync(fecha_inicio, fecha_fin, operacionFiltro, usuarioFiltro, page, limit);
        return Ok(items);
    }
}
