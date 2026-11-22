namespace backend;

public class detallePagoTelepeaje
{
    public long Id_detalle_telepeaje { get; set; }
    public long Id_transaccion { get; set; }
    public long Id_cuenta { get; set; }
    public decimal Saldo_anterior { get; set; }
    public decimal Saldo_posterior { get; set; }
    public string Antena_lectora_id { get; set; }

    public detallePagoTelepeaje(long id_detalle_telepeaje, long id_transaccion, long id_cuenta, decimal saldo_anterior, decimal saldo_posterior, string antena_lectora_id)
    {
        Id_detalle_telepeaje = id_detalle_telepeaje;
        Id_transaccion = id_transaccion;
        Id_cuenta = id_cuenta;
        Saldo_anterior = saldo_anterior;
        Saldo_posterior = saldo_posterior;
        Antena_lectora_id = antena_lectora_id;
    }
}
