using System;

namespace PeajeSys.Core.Entities;

public class EstacionPeaje
{
    public int IdEstacion { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CodigoEstacion { get; set; } = string.Empty;
    public string UbicacionGeografica { get; set; } = string.Empty;
    public string SentidoVia { get; set; } = string.Empty;
    public string Estado { get; set; } = "ACTIVA";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Caseta
{
    public int IdCaseta { get; set; }
    public int IdEstacion { get; set; }
    public int NumeroCarril { get; set; }
    public string TipoCarril { get; set; } = "MANUAL";
    public string Estado { get; set; } = "OPERATIVA";

    public EstacionPeaje? Estacion { get; set; }
}

public class Operador
{
    public int IdOperador { get; set; }
    public string NumeroDocumento { get; set; } = string.Empty;
    public string Nombres { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string CodigoEmpleado { get; set; } = string.Empty;
    public string Rol { get; set; } = "RECAUDADOR";
    public string Estado { get; set; } = "ACTIVO";
    public string? PasswordHash { get; set; }
}

public class Turno
{
    public long IdTurno { get; set; }
    public int IdCaseta { get; set; }
    public int IdOperador { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow.Date;
    public bool Diurno { get; set; } = true;
    public decimal FondoInicialCaja { get; set; }
    public decimal TotalRecaudadoEfectivo { get; set; }
    public decimal? TotalDeclaradoCierre { get; set; }
    public decimal? DiferenciaDescuadre { get; set; }
    public string Estado { get; set; } = "ABIERTO";

    public Caseta? Caseta { get; set; }
    public Operador? Operador { get; set; }
}

public class CategoriaVehiculo
{
    public int IdCategoria { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public int NumeroEjesMin { get; set; } = 2;
    public int NumeroEjesMax { get; set; } = 2;
    public decimal? PesoMaximoTon { get; set; }
    public bool Activo { get; set; } = true;
}

public class Tarifa
{
    public int IdTarifa { get; set; }
    public int IdEstacion { get; set; }
    public int IdCategoria { get; set; }
    public decimal Monto { get; set; }
    public string ResolucionLegal { get; set; } = string.Empty;
    public DateTime FechaInicioVigencia { get; set; }
    public DateTime? FechaFinVigencia { get; set; }
    public bool Activa { get; set; } = true;

    public EstacionPeaje? Estacion { get; set; }
    public CategoriaVehiculo? Categoria { get; set; }
}

public class Vehiculo
{
    public string Placa { get; set; } = string.Empty;
    public int IdCategoria { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public string? Color { get; set; }

    public CategoriaVehiculo? Categoria { get; set; }
}

public class CuentaTelepeaje
{
    public long IdCuenta { get; set; }
    public string PlacaVehiculo { get; set; } = string.Empty;
    public string TagRfidSerial { get; set; } = string.Empty;
    public decimal SaldoDisponible { get; set; }
    public string EstadoCuenta { get; set; } = "ACTIVA";

    public Vehiculo? Vehiculo { get; set; }
}

public class DetallePagoTelepeaje
{
    public long IdDetalleTelepeaje { get; set; }
    public long IdTransaccion { get; set; }
    public long IdCuenta { get; set; }
    public decimal SaldoAnterior { get; set; }
    public decimal SaldoPosterior { get; set; }
    public string AntenaLectoraId { get; set; } = string.Empty;

    public TransaccionPeaje? Transaccion { get; set; }
    public CuentaTelepeaje? Cuenta { get; set; }
}

public class TransaccionPeaje
{
    public long IdTransaccion { get; set; }
    public long IdTurno { get; set; }
    public int IdTarifa { get; set; }
    public int IdCategoria { get; set; }
    public string? PlacaDetectada { get; set; }
    public decimal MontoTarifa { get; set; }
    public string MetodoPago { get; set; } = "EFECTIVO";
    public string NumeroTicket { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public string EstadoPaso { get; set; } = "APROBADO";

    public Turno? Turno { get; set; }
    public Tarifa? Tarifa { get; set; }
    public CategoriaVehiculo? Categoria { get; set; }
}

public class AuditoriaTransaccion
{
    public long IdAuditoria { get; set; }
    public long? IdTransaccion { get; set; }
    public string TipoOperacion { get; set; } = "INSERT";
    public string UsuarioResponsable { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public string? DatosAnteriores { get; set; }
    public string? DatosNuevos { get; set; }
    public string? MotivoAnulacion { get; set; }

    public TransaccionPeaje? Transaccion { get; set; }
}

public class ResumenDiarioEstacion
{
    public int IdEstacion { get; set; }
    public string Estacion { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public long TotalVehiculos { get; set; }
    public decimal RecaudoEfectivo { get; set; }
    public decimal RecaudoTelepeaje { get; set; }
    public decimal RecaudoTotal { get; set; }
    public decimal TotalRecaudado { get => RecaudoTotal; set => RecaudoTotal = value; }
}

public class EstadoCuentaTelepeaje
{
    public long IdCuenta { get; set; }
    public string PlacaVehiculo { get; set; } = string.Empty;
    public string Placa { get => PlacaVehiculo; set => PlacaVehiculo = value; }
    public string CategoriaVehiculo { get; set; } = string.Empty;
    public string TagRfidSerial { get; set; } = string.Empty;
    public string TagRfid { get => TagRfidSerial; set => TagRfidSerial = value; }
    public decimal SaldoDisponible { get; set; }
    public decimal Saldo { get => SaldoDisponible; set => SaldoDisponible = value; }
    public string EstadoCuenta { get; set; } = string.Empty;
    public string Estado { get => EstadoCuenta; set => EstadoCuenta = value; }
    public string CondicionSaldo { get; set; } = string.Empty;
}
