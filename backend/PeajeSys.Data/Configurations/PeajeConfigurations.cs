using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PeajeSys.Core.Entities;

namespace PeajeSys.Data.Configurations;

public class EstacionPeajeConfiguration : IEntityTypeConfiguration<EstacionPeaje>
{
    public void Configure(EntityTypeBuilder<EstacionPeaje> builder)
    {
        builder.ToTable("estacion_peaje");
        builder.HasKey(e => e.IdEstacion);
        builder.Property(e => e.IdEstacion).HasColumnName("id_estacion").ValueGeneratedOnAdd();
        builder.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
        builder.Property(e => e.CodigoEstacion).HasColumnName("codigo_estacion").HasMaxLength(20).IsRequired();
        builder.Property(e => e.UbicacionGeografica).HasColumnName("ubicacion_geografica").HasMaxLength(255).IsRequired();
        builder.Property(e => e.SentidoVia).HasColumnName("sentido_via").HasMaxLength(50).IsRequired();
        builder.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

        builder.HasIndex(e => e.CodigoEstacion).IsUnique();
    }
}

public class CasetaConfiguration : IEntityTypeConfiguration<Caseta>
{
    public void Configure(EntityTypeBuilder<Caseta> builder)
    {
        builder.ToTable("caseta");
        builder.HasKey(e => e.IdCaseta);
        builder.Property(e => e.IdCaseta).HasColumnName("id_caseta").ValueGeneratedOnAdd();
        builder.Property(e => e.IdEstacion).HasColumnName("id_estacion").IsRequired();
        builder.Property(e => e.NumeroCarril).HasColumnName("numero_carril").IsRequired();
        builder.Property(e => e.TipoCarril).HasColumnName("tipo_carril").HasMaxLength(30).IsRequired();
        builder.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();

        builder.HasOne(c => c.Estacion)
            .WithMany()
            .HasForeignKey(c => c.IdEstacion)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => new { c.IdEstacion, c.NumeroCarril }).IsUnique();
    }
}

public class OperadorConfiguration : IEntityTypeConfiguration<Operador>
{
    public void Configure(EntityTypeBuilder<Operador> builder)
    {
        builder.ToTable("operador");
        builder.HasKey(e => e.IdOperador);
        builder.Property(e => e.IdOperador).HasColumnName("id_operador").ValueGeneratedOnAdd();
        builder.Property(e => e.NumeroDocumento).HasColumnName("numero_documento").HasMaxLength(20).IsRequired();
        builder.Property(e => e.Nombres).HasColumnName("nombres").HasMaxLength(100).IsRequired();
        builder.Property(e => e.Apellidos).HasColumnName("apellidos").HasMaxLength(100).IsRequired();
        builder.Property(e => e.CodigoEmpleado).HasColumnName("codigo_empleado").HasMaxLength(20).IsRequired();
        builder.Property(e => e.Rol).HasColumnName("rol").HasMaxLength(30).IsRequired();
        builder.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();

        builder.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(100);

        builder.HasIndex(e => e.NumeroDocumento).IsUnique();
        builder.HasIndex(e => e.CodigoEmpleado).IsUnique();
    }
}

public class TurnoConfiguration : IEntityTypeConfiguration<Turno>
{
    public void Configure(EntityTypeBuilder<Turno> builder)
    {
        builder.ToTable("turno");
        builder.HasKey(e => e.IdTurno);
        builder.Property(e => e.IdTurno).HasColumnName("id_turno").ValueGeneratedOnAdd();
        builder.Property(e => e.IdCaseta).HasColumnName("id_caseta").IsRequired();
        builder.Property(e => e.IdOperador).HasColumnName("id_operador").IsRequired();
        builder.Property(e => e.Fecha).HasColumnName("fecha").HasColumnType("date").IsRequired();
        builder.Property(e => e.Diurno).HasColumnName("diurno").IsRequired();
        builder.Property(e => e.FondoInicialCaja).HasColumnName("fondo_inicial_caja").HasPrecision(12, 2).IsRequired();
        builder.Property(e => e.TotalRecaudadoEfectivo).HasColumnName("total_recaudado_efectivo").HasPrecision(12, 2);
        builder.Property(e => e.TotalDeclaradoCierre).HasColumnName("total_declarado_cierre").HasPrecision(12, 2);
        builder.Property(e => e.DiferenciaDescuadre).HasColumnName("diferencia_descuadre").HasPrecision(12, 2);
        builder.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();

        builder.HasOne(t => t.Caseta)
            .WithMany()
            .HasForeignKey(t => t.IdCaseta)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Operador)
            .WithMany()
            .HasForeignKey(t => t.IdOperador)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class CategoriaVehiculoConfiguration : IEntityTypeConfiguration<CategoriaVehiculo>
{
    public void Configure(EntityTypeBuilder<CategoriaVehiculo> builder)
    {
        builder.ToTable("categoria_vehiculo");
        builder.HasKey(e => e.IdCategoria);
        builder.Property(e => e.IdCategoria).HasColumnName("id_categoria").ValueGeneratedOnAdd();
        builder.Property(e => e.Codigo).HasColumnName("codigo").HasMaxLength(10).IsRequired();
        builder.Property(e => e.Descripcion).HasColumnName("descripcion").HasMaxLength(150).IsRequired();
        builder.Property(e => e.NumeroEjesMin).HasColumnName("numero_ejes_min").IsRequired();
        builder.Property(e => e.NumeroEjesMax).HasColumnName("numero_ejes_max").IsRequired();
        builder.Property(e => e.PesoMaximoTon).HasColumnName("peso_maximo_ton").HasPrecision(5, 2);
        builder.Property(e => e.Activo).HasColumnName("activo").IsRequired();

        builder.HasIndex(e => e.Codigo).IsUnique();
    }
}

public class TarifaConfiguration : IEntityTypeConfiguration<Tarifa>
{
    public void Configure(EntityTypeBuilder<Tarifa> builder)
    {
        builder.ToTable("tarifa");
        builder.HasKey(e => e.IdTarifa);
        builder.Property(e => e.IdTarifa).HasColumnName("id_tarifa").ValueGeneratedOnAdd();
        builder.Property(e => e.IdEstacion).HasColumnName("id_estacion").IsRequired();
        builder.Property(e => e.IdCategoria).HasColumnName("id_categoria").IsRequired();
        builder.Property(e => e.Monto).HasColumnName("monto").HasPrecision(10, 2).IsRequired();
        builder.Property(e => e.ResolucionLegal).HasColumnName("resolucion_legal").HasMaxLength(50).IsRequired();
        builder.Property(e => e.FechaInicioVigencia).HasColumnName("fecha_inicio_vigencia").HasColumnType("date").IsRequired();
        builder.Property(e => e.FechaFinVigencia).HasColumnName("fecha_fin_vigencia").HasColumnType("date");
        builder.Property(e => e.Activa).HasColumnName("activa").IsRequired();

        builder.HasOne(t => t.Estacion)
            .WithMany()
            .HasForeignKey(t => t.IdEstacion)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Categoria)
            .WithMany()
            .HasForeignKey(t => t.IdCategoria)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class VehiculoConfiguration : IEntityTypeConfiguration<Vehiculo>
{
    public void Configure(EntityTypeBuilder<Vehiculo> builder)
    {
        builder.ToTable("vehiculo");
        builder.HasKey(e => e.Placa);
        builder.Property(e => e.Placa).HasColumnName("placa").HasMaxLength(10).IsRequired();
        builder.Property(e => e.IdCategoria).HasColumnName("id_categoria").IsRequired();
        builder.Property(e => e.Marca).HasColumnName("marca").HasMaxLength(50);
        builder.Property(e => e.Modelo).HasColumnName("modelo").HasMaxLength(50);
        builder.Property(e => e.Color).HasColumnName("color").HasMaxLength(30);

        builder.HasOne(v => v.Categoria)
            .WithMany()
            .HasForeignKey(v => v.IdCategoria)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class CuentaTelepeajeConfiguration : IEntityTypeConfiguration<CuentaTelepeaje>
{
    public void Configure(EntityTypeBuilder<CuentaTelepeaje> builder)
    {
        builder.ToTable("cuenta_telepeaje");
        builder.HasKey(e => e.IdCuenta);
        builder.Property(e => e.IdCuenta).HasColumnName("id_cuenta").ValueGeneratedOnAdd();
        builder.Property(e => e.PlacaVehiculo).HasColumnName("placa_vehiculo").HasMaxLength(10).IsRequired();
        builder.Property(e => e.TagRfidSerial).HasColumnName("tag_rfid_serial").HasMaxLength(50).IsRequired();
        builder.Property(e => e.SaldoDisponible).HasColumnName("saldo_disponible").HasPrecision(12, 2).IsRequired();
        builder.Property(e => e.EstadoCuenta).HasColumnName("estado_cuenta").HasMaxLength(20).IsRequired();

        builder.HasIndex(e => e.PlacaVehiculo).IsUnique();
        builder.HasIndex(e => e.TagRfidSerial).IsUnique();

        builder.HasOne(c => c.Vehiculo)
            .WithMany()
            .HasForeignKey(c => c.PlacaVehiculo)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class DetallePagoTelepeajeConfiguration : IEntityTypeConfiguration<DetallePagoTelepeaje>
{
    public void Configure(EntityTypeBuilder<DetallePagoTelepeaje> builder)
    {
        builder.ToTable("detalle_pago_telepeaje");
        builder.HasKey(e => e.IdDetalleTelepeaje);
        builder.Property(e => e.IdDetalleTelepeaje).HasColumnName("id_detalle_telepeaje").ValueGeneratedOnAdd();
        builder.Property(e => e.IdTransaccion).HasColumnName("id_transaccion").IsRequired();
        builder.Property(e => e.IdCuenta).HasColumnName("id_cuenta").IsRequired();
        builder.Property(e => e.SaldoAnterior).HasColumnName("saldo_anterior").HasPrecision(12, 2).IsRequired();
        builder.Property(e => e.SaldoPosterior).HasColumnName("saldo_posterior").HasPrecision(12, 2).IsRequired();
        builder.Property(e => e.AntenaLectoraId).HasColumnName("antena_lectora_id").HasMaxLength(50).IsRequired();

        builder.HasIndex(e => e.IdTransaccion).IsUnique();

        builder.HasOne(d => d.Transaccion)
            .WithMany()
            .HasForeignKey(d => d.IdTransaccion)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Cuenta)
            .WithMany()
            .HasForeignKey(d => d.IdCuenta)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class TransaccionPeajeConfiguration : IEntityTypeConfiguration<TransaccionPeaje>
{
    public void Configure(EntityTypeBuilder<TransaccionPeaje> builder)
    {
        builder.ToTable("transaccion_peaje");
        builder.HasKey(e => e.IdTransaccion);
        builder.Property(e => e.IdTransaccion).HasColumnName("id_transaccion").ValueGeneratedOnAdd();
        builder.Property(e => e.IdTurno).HasColumnName("id_turno").IsRequired();
        builder.Property(e => e.IdTarifa).HasColumnName("id_tarifa").IsRequired();
        builder.Property(e => e.IdCategoria).HasColumnName("id_categoria").IsRequired();
        builder.Property(e => e.PlacaDetectada).HasColumnName("placa_detectada").HasMaxLength(10);
        builder.Property(e => e.MontoTarifa).HasColumnName("monto_tarifa").HasPrecision(10, 2).IsRequired();
        builder.Property(e => e.MetodoPago).HasColumnName("metodo_pago").HasMaxLength(20).IsRequired();
        builder.Property(e => e.NumeroTicket).HasColumnName("numero_ticket").HasMaxLength(30).IsRequired();
        builder.Property(e => e.FechaHora).HasColumnName("fecha_hora").HasDefaultValueSql("NOW()").IsRequired();
        builder.Property(e => e.EstadoPaso).HasColumnName("estado_paso").HasMaxLength(20).IsRequired();

        builder.HasIndex(e => e.NumeroTicket).IsUnique();

        builder.HasOne(t => t.Turno)
            .WithMany()
            .HasForeignKey(t => t.IdTurno)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Tarifa)
            .WithMany()
            .HasForeignKey(t => t.IdTarifa)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Categoria)
            .WithMany()
            .HasForeignKey(t => t.IdCategoria)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AuditoriaTransaccionConfiguration : IEntityTypeConfiguration<AuditoriaTransaccion>
{
    public void Configure(EntityTypeBuilder<AuditoriaTransaccion> builder)
    {
        builder.ToTable("auditoria_transaccion");
        builder.HasKey(e => e.IdAuditoria);
        builder.Property(e => e.IdAuditoria).HasColumnName("id_auditoria").ValueGeneratedOnAdd();
        builder.Property(e => e.IdTransaccion).HasColumnName("id_transaccion");
        builder.Property(e => e.TipoOperacion).HasColumnName("tipo_operacion").HasMaxLength(10).IsRequired();
        builder.Property(e => e.UsuarioResponsable).HasColumnName("usuario_responsable").HasMaxLength(100).IsRequired();
        builder.Property(e => e.FechaHora).HasColumnName("fecha_hora").HasDefaultValueSql("NOW()").IsRequired();
        builder.Property(e => e.DatosAnteriores).HasColumnName("datos_anteriores").HasColumnType("jsonb");
        builder.Property(e => e.DatosNuevos).HasColumnName("datos_nuevos").HasColumnType("jsonb");
        builder.Property(e => e.MotivoAnulacion).HasColumnName("motivo_anulacion").HasMaxLength(255);

        builder.HasOne(a => a.Transaccion)
            .WithMany()
            .HasForeignKey(a => a.IdTransaccion)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
