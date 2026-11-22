using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Exceptions;
using PeajeSys.Core.Interfaces;
using PeajeSys.Data;

namespace PeajeSys.Api.Services;

public class VehiculoService : IVehiculoService
{
    private readonly PeajeSysDbContext _context;

    public VehiculoService(PeajeSysDbContext context)
    {
        _context = context;
    }

    public async Task<VehiculoConsultaDto> ConsultarVehiculoAsync(string placa)
    {
        // Normalizar placa: mayusculas y sin espacios
        string placaNorm = (placa ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", "");

        var vehiculo = await _context.Vehiculos
            .Include(v => v.Categoria)
            .FirstOrDefaultAsync(v => v.Placa == placaNorm);

        if (vehiculo == null)
        {
            throw new NotFoundException("VEHICULO_NO_ENCONTRADO", $"Vehiculo con placa {placaNorm} no encontrado en el sistema.");
        }

        var cuenta = await _context.CuentasTelepeaje
            .FirstOrDefaultAsync(c => c.PlacaVehiculo == placaNorm);

        var vehiculoDetalle = new VehiculoDetalleDto
        {
            Placa = vehiculo.Placa,
            IdCategoria = vehiculo.IdCategoria,
            Marca = vehiculo.Marca,
            Modelo = vehiculo.Modelo,
            Color = vehiculo.Color
        };

        CuentaTelepeajeDetalleDto? cuentaDetalle = null;
        if (cuenta != null)
        {
            cuentaDetalle = new CuentaTelepeajeDetalleDto
            {
                IdCuenta = cuenta.IdCuenta,
                PlacaVehiculo = cuenta.PlacaVehiculo,
                TagRfidSerial = cuenta.TagRfidSerial,
                SaldoDisponible = cuenta.SaldoDisponible,
                EstadoCuenta = cuenta.EstadoCuenta
            };
        }

        return new VehiculoConsultaDto
        {
            Placa = placaNorm,
            Encontrado = true,
            IdCategoria = vehiculo.IdCategoria,
            CategoriaCodigo = vehiculo.Categoria?.Codigo ?? string.Empty,
            CategoriaDescripcion = vehiculo.Categoria?.Descripcion ?? string.Empty,
            Marca = vehiculo.Marca,
            Modelo = vehiculo.Modelo,
            Color = vehiculo.Color,
            TieneTag = cuenta != null,
            TagRfidSerial = cuenta?.TagRfidSerial,
            EstadoCuenta = cuenta?.EstadoCuenta,
            SaldoDisponible = cuenta?.SaldoDisponible,
            Vehiculo = vehiculoDetalle,
            Cuenta = cuentaDetalle
        };
    }
}
