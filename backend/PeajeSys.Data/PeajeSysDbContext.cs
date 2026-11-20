using Microsoft.EntityFrameworkCore;
using PeajeSys.Core.Entities;
using PeajeSys.Data.Configurations;

namespace PeajeSys.Data;

public class PeajeSysDbContext : DbContext
{
    public PeajeSysDbContext(DbContextOptions<PeajeSysDbContext> options) : base(options)
    {
    }

    public DbSet<EstacionPeaje> EstacionesPeaje => Set<EstacionPeaje>();
    public DbSet<Caseta> Casetas => Set<Caseta>();
    public DbSet<Operador> Operadores => Set<Operador>();
    public DbSet<Turno> Turnos => Set<Turno>();
    public DbSet<CategoriaVehiculo> CategoriasVehiculo => Set<CategoriaVehiculo>();
    public DbSet<Tarifa> Tarifas => Set<Tarifa>();
    public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();
    public DbSet<CuentaTelepeaje> CuentasTelepeaje => Set<CuentaTelepeaje>();
    public DbSet<DetallePagoTelepeaje> DetallesPagoTelepeaje => Set<DetallePagoTelepeaje>();
    public DbSet<TransaccionPeaje> TransaccionesPeaje => Set<TransaccionPeaje>();
    public DbSet<AuditoriaTransaccion> AuditoriasTransaccion => Set<AuditoriaTransaccion>();

    // Vistas de solo lectura (Keyless)
    public DbSet<ResumenDiarioEstacion> ResumenDiarioEstaciones => Set<ResumenDiarioEstacion>();
    public DbSet<EstadoCuentaTelepeaje> EstadoCuentasTelepeaje => Set<EstadoCuentaTelepeaje>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfiguration(new EstacionPeajeConfiguration());
        modelBuilder.ApplyConfiguration(new CasetaConfiguration());
        modelBuilder.ApplyConfiguration(new OperadorConfiguration());
        modelBuilder.ApplyConfiguration(new TurnoConfiguration());
        modelBuilder.ApplyConfiguration(new CategoriaVehiculoConfiguration());
        modelBuilder.ApplyConfiguration(new TarifaConfiguration());
        modelBuilder.ApplyConfiguration(new VehiculoConfiguration());
        modelBuilder.ApplyConfiguration(new CuentaTelepeajeConfiguration());
        modelBuilder.ApplyConfiguration(new DetallePagoTelepeajeConfiguration());
        modelBuilder.ApplyConfiguration(new TransaccionPeajeConfiguration());
        modelBuilder.ApplyConfiguration(new AuditoriaTransaccionConfiguration());

        // Configuracion de Vistas Keyless
        modelBuilder.Entity<ResumenDiarioEstacion>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_resumen_diario_estacion");
            entity.Property(e => e.IdEstacion).HasColumnName("id_estacion");
            entity.Property(e => e.Estacion).HasColumnName("estacion");
            entity.Property(e => e.Fecha).HasColumnName("fecha");
            entity.Property(e => e.TotalVehiculos).HasColumnName("total_vehiculos");
            entity.Property(e => e.RecaudoEfectivo).HasColumnName("recaudo_efectivo");
            entity.Property(e => e.RecaudoTelepeaje).HasColumnName("recaudo_telepeaje");
            entity.Property(e => e.RecaudoTotal).HasColumnName("recaudo_total");
            entity.Ignore(e => e.TotalRecaudado);
        });

        modelBuilder.Entity<EstadoCuentaTelepeaje>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_estado_cuentas_telepeaje");
            entity.Property(e => e.IdCuenta).HasColumnName("id_cuenta");
            entity.Property(e => e.PlacaVehiculo).HasColumnName("placa_vehiculo");
            entity.Property(e => e.CategoriaVehiculo).HasColumnName("categoria_vehiculo");
            entity.Property(e => e.TagRfidSerial).HasColumnName("tag_rfid_serial");
            entity.Property(e => e.SaldoDisponible).HasColumnName("saldo_disponible");
            entity.Property(e => e.EstadoCuenta).HasColumnName("estado_cuenta");
            entity.Property(e => e.CondicionSaldo).HasColumnName("condicion_saldo");
            entity.Ignore(e => e.Placa);
            entity.Ignore(e => e.TagRfid);
            entity.Ignore(e => e.Saldo);
            entity.Ignore(e => e.Estado);
        });

        modelBuilder.HasSequence<long>("seq_numero_ticket");
    }
}
