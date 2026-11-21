using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class TurnoService : ITurnoService
{
    private readonly PeajeSysDbContext _context;

    public TurnoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<AbrirTurnoResponseDto> AbrirTurnoAsync(AbrirTurnoRequestDto request)
    {
        if (request.IdCaseta <= 0)
        {
            throw new AppException("CASETA_REQUERIDA", "El identificador de caseta es invalido.", 400);
        }

        if (request.IdOperador <= 0)
        {
            throw new AppException("OPERADOR_REQUERIDO", "El identificador de operador es invalido.", 400);
        }

        // Regla: caseta sin turno ABIERTO
        bool casetaOcupada = await _context.Turnos
            .AnyAsync(t => t.IdCaseta == request.IdCaseta && t.Estado == "ABIERTO");
        if (casetaOcupada)
        {
            throw new ConflictException("CASETA_OCUPADA", "La caseta ya tiene un turno ABIERTO.");
        }

        // Regla: operador sin turno ABIERTO en el sistema
        bool operadorActivo = await _context.Turnos
            .AnyAsync(t => t.IdOperador == request.IdOperador && t.Estado == "ABIERTO");
        if (operadorActivo)
        {
            throw new ConflictException("OPERADOR_CON_TURNO_ACTIVO", "El operador ya tiene un turno ABIERTO en el sistema.");
        }

        var turno = new Turno
        {
            IdCaseta = request.IdCaseta,
            IdOperador = request.IdOperador,
            Fecha = DateTime.UtcNow.Date,
            Diurno = request.Diurno,
            FondoInicialCaja = request.FondoInicialCaja,
            TotalRecaudadoEfectivo = 0,
            Estado = "ABIERTO"
        };

        _context.Turnos.Add(turno);
        await _context.SaveChangesAsync();

        return new AbrirTurnoResponseDto
        {
            IdTurno = turno.IdTurno,
            IdCaseta = turno.IdCaseta,
            IdOperador = turno.IdOperador,
            Fecha = turno.Fecha.ToString("yyyy-MM-dd"),
            Diurno = turno.Diurno,
            FondoInicialCaja = turno.FondoInicialCaja,
            TotalRecaudadoEfectivo = turno.TotalRecaudadoEfectivo,
            Estado = turno.Estado
        };
    }

    public async Task<TurnoDto> CerrarTurnoAsync(long idTurno, CerrarTurnoRequestDto request)
    {
        var turno = await _context.Turnos.FindAsync(idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }

        if (turno.Estado == "CERRADO")
        {
            throw new ConflictException("TURNO_YA_CERRADO", "El turno ya se encuentra cerrado.");
        }

        if (request.TotalDeclaradoCierre < 0)
        {
            throw new AppException("ERROR_VALIDACION", "El total declarado en el cierre no puede ser negativo.", 422);
        }

        turno.Estado = "CERRADO";
        turno.TotalDeclaradoCierre = request.TotalDeclaradoCierre;
        turno.DiferenciaDescuadre = request.TotalDeclaradoCierre - turno.TotalRecaudadoEfectivo;

        await _context.SaveChangesAsync();

        return MapearTurno(turno);
    }

    public async Task<TurnoDto> ObtenerTurnoAsync(long idTurno)
    {
        var turno = await _context.Turnos.FindAsync(idTurno);
        if (turno == null)
        {
            throw new NotFoundException("TURNO_NO_ENCONTRADO", $"No existe un turno con id {idTurno}.");
        }

        return MapearTurno(turno);
    }

    public Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, string? operador, string? estado, string? fecha = null, int? idEstacion = null)
    {
        int? operadorId = int.TryParse(operador, out var id) ? id : null;
        return ListarTurnosAsync(idCaseta, operadorId, estado);
    }

    public async Task<IEnumerable<TurnoDto>> ListarTurnosAsync(int? idCaseta, int? idOperador, string? estado)
    {
        var query = _context.Turnos.AsQueryable();

        if (idCaseta.HasValue)
        {
            query = query.Where(t => t.IdCaseta == idCaseta.Value);
        }

        if (idOperador.HasValue)
        {
            query = query.Where(t => t.IdOperador == idOperador.Value);
        }

        if (!string.IsNullOrWhiteSpace(estado))
        {
            string estadoNorm = estado.Trim().ToUpperInvariant();
            query = query.Where(t => t.Estado == estadoNorm);
        }

        var lista = await query.ToListAsync();
        return lista.Select(MapearTurno);
    }

    private static TurnoDto MapearTurno(Turno t) => new TurnoDto
    {
        IdTurno = t.IdTurno,
        IdCaseta = t.IdCaseta,
        IdOperador = t.IdOperador,
        Fecha = t.Fecha.ToString("yyyy-MM-dd"),
        Diurno = t.Diurno,
        FondoInicialCaja = t.FondoInicialCaja,
        TotalRecaudadoEfectivo = t.TotalRecaudadoEfectivo,
        TotalDeclaradoCierre = t.TotalDeclaradoCierre,
        DiferenciaDescuadre = t.DiferenciaDescuadre,
        Estado = t.Estado
    };
}

