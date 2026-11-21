using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class TransaccionService : ITransaccionService
{
    private readonly PeajeSysDbContext _context;

    public TransaccionService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public Task<IReadOnlyList<TransaccionDetalleDto>> ListarPorTurnoAsync(long idTurno, ActorOperacion actor)
        => throw new NotImplementedException();

    public Task<AnulacionTransaccionResponseDto> AnularAsync(long idTransaccion, AnularTransaccionRequestDto request, ActorOperacion actor)
        => throw new NotImplementedException();
}
