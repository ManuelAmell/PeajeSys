using System;

namespace backend;

public class transaccionPeaje
{
    public long Id_transaccion { get; set; }
    public long Id_turno { get; set; }
    public int Id_tarifa { get; set; }
    public int Id_categoria { get; set; }
    public string Placa_detectada { get; set; }
    public decimal Monto_tarifa { get; set; }
    public string Metodo_pago { get; set; }
    public string Numero_ticket { get; set; }
    public DateTime Fecha_hora { get; set; }
    public string Estado_paso { get; set; }

    public transaccionPeaje(long id_transaccion, long id_turno, int id_tarifa, int id_categoria, string placa_detectada, decimal monto_tarifa, string metodo_pago, string numero_ticket, DateTime fecha_hora, string estado_paso)
    {
        Id_transaccion = id_transaccion;
        Id_turno = id_turno;
        Id_tarifa = id_tarifa;
        Id_categoria = id_categoria;
        Placa_detectada = placa_detectada;
        Monto_tarifa = monto_tarifa;
        Metodo_pago = metodo_pago;
        Numero_ticket = numero_ticket;
        Fecha_hora = fecha_hora;
        Estado_paso = estado_paso;
    }
}
