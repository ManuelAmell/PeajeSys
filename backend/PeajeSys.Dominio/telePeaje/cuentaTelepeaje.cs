namespace backend;

public class cuentaTelepeaje
{
    public long Id_cuenta { get; set; }
    public string Placa_vehiculo { get; set; }
    public string Tag_rfid_serial { get; set; }
    public decimal Saldo_disponible { get; set; }
    public string Estado_cuenta { get; set; }

    public cuentaTelepeaje(long id_cuenta, string placa_vehiculo, string tag_rfid_serial, decimal saldo_disponible, string estado_cuenta)
    {
        Id_cuenta = id_cuenta;
        Placa_vehiculo = placa_vehiculo;
        Tag_rfid_serial = tag_rfid_serial;
        Saldo_disponible = saldo_disponible;
        Estado_cuenta = estado_cuenta;
    }
}
