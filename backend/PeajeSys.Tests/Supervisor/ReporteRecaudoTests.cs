using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PeajeSys.Core.DTOs;
using PeajeSys.Core.Entities;
using PeajeSys.Core.Interfaces;
using Xunit;

namespace PeajeSys.Tests.Supervisor;

public class ReporteRecaudoTests
{
    private class FakeReporteRecaudoService : IReporteRecaudoService
    {
        private readonly List<ResumenDiarioEstacion> _resumenes;

        public FakeReporteRecaudoService()
        {
            _resumenes = new List<ResumenDiarioEstacion>
            {
                new()
                {
                    IdEstacion = 1,
                    Estacion = "Estacion Gambote",
                    Fecha = new DateTime(2026, 10, 6),
                    TotalVehiculos = 142,
                    RecaudoEfectivo = 1250000m,
                    RecaudoTelepeaje = 850000m,
                    RecaudoTotal = 2100000m
                },
                new()
                {
                    IdEstacion = 2,
                    Estacion = "Estacion Turbaco",
                    Fecha = new DateTime(2026, 10, 6),
                    TotalVehiculos = 98,
                    RecaudoEfectivo = 800000m,
                    RecaudoTelepeaje = 450000m,
                    RecaudoTotal = 1250000m
                }
            };
        }

        public Task<RecaudoDiarioDto> ObtenerRecaudoDiarioAsync(int? idEstacion, string? fecha)
        {
            var query = _resumenes.AsQueryable();

            if (idEstacion.HasValue)
                query = query.Where(r => r.IdEstacion == idEstacion.Value);

            var items = query.ToList();

            var dias = items.Select(i => new RecaudoDiaItemDto
            {
                Fecha = i.Fecha.ToString("yyyy-MM-dd"),
                Veh = i.TotalVehiculos,
                Ef = i.RecaudoEfectivo,
                Tag = i.RecaudoTelepeaje,
                Total = i.RecaudoTotal
            }).ToList();

            return Task.FromResult(new RecaudoDiarioDto
            {
                IdEstacion = idEstacion,
                Estacion = idEstacion.HasValue ? items.FirstOrDefault()?.Estacion : "Todas",
                Fecha = fecha ?? "2026-10-06",
                TotalVehiculos = items.Sum(i => i.TotalVehiculos),
                TotalEfectivo = items.Sum(i => i.RecaudoEfectivo),
                TotalTelepeaje = items.Sum(i => i.RecaudoTelepeaje),
                TotalGeneral = items.Sum(i => i.RecaudoTotal),
                Dias = dias
            });
        }
    }

    [Fact]
    public async Task ObtenerRecaudoDiario_FiltroPorEstacion_CalculaTotalesCorrectos()
    {
        // Arrange
        var service = new FakeReporteRecaudoService();

        // Act
        var result = await service.ObtenerRecaudoDiarioAsync(1, "2026-10-06");

        // Assert
        Assert.Equal(1, result.IdEstacion);
        Assert.Equal("Estacion Gambote", result.Estacion);
        Assert.Equal(142, result.TotalVehiculos);
        Assert.Equal(1250000m, result.TotalEfectivo);
        Assert.Equal(850000m, result.TotalTelepeaje);
        Assert.Equal(2100000m, result.TotalGeneral);
        // Regla: total_general == total_efectivo + total_telepeaje
        Assert.Equal(result.TotalEfectivo + result.TotalTelepeaje, result.TotalGeneral);
    }

    [Fact]
    public async Task ObtenerRecaudoDiario_ConsolidadoGlobal_SumaTodasLasEstaciones()
    {
        // Arrange
        var service = new FakeReporteRecaudoService();

        // Act
        var result = await service.ObtenerRecaudoDiarioAsync(null, "2026-10-06");

        // Assert
        Assert.Null(result.IdEstacion);
        Assert.Equal(240, result.TotalVehiculos); // 142 + 98
        Assert.Equal(2050000m, result.TotalEfectivo); // 1.250.000 + 800.000
        Assert.Equal(1300000m, result.TotalTelepeaje); // 850.000 + 450.000
        Assert.Equal(3350000m, result.TotalGeneral);
        Assert.Equal(2, result.Dias.Count);
    }

    [Fact]
    public void EntidadResumenDiarioEstacion_MapeaPropiedadesCompatibles()
    {
        // Arrange
        var resumen = new ResumenDiarioEstacion
        {
            IdEstacion = 1,
            Estacion = "Estacion Gambote",
            Fecha = new DateTime(2026, 10, 6),
            TotalVehiculos = 50,
            RecaudoEfectivo = 300000m,
            RecaudoTelepeaje = 200000m,
            RecaudoTotal = 500000m
        };

        // Assert
        Assert.Equal(500000m, resumen.TotalRecaudado);
        Assert.Equal(500000m, resumen.RecaudoTotal);
    }
}
