namespace backend;

public class vehiculo
{
public string Placa { get; set; }
public int Id_categoria { get; set; }
public string Marca { get; set; }
public string Modelo { get; set; }
public string Color { get; set; }


public vehiculo(string placa, int id_categoria, string marca, string modelo, string color)
{
  Placa=placa;
  Id_categoria=id_categoria;
  Marca=marca;
  Modelo=modelo;
  Color=color;
    
}

}