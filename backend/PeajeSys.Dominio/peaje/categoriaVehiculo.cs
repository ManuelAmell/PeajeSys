namespace backend;

public class categoriaVehiculo{

public int Id_categoria{get; set;}
public string Codigo{get; set;}
public string Descripcion{get; set;}
public int Nro_ejes_min{get; set;}
public int Nro_ejes_max{get; set;}
public float Peso_max_ton{get; set;}
public bool Activo{get; set;}


public categoriaVehiculo(int id_categoria, string codigo, string descripcion, int nro_ejes_min, int nro_ejes_max, float peso_max_ton, bool activo)
{

    Id_categoria = id_categoria;
    Codigo = codigo;
    Descripcion = descripcion;
    Nro_ejes_min = nro_ejes_min;
    Nro_ejes_max = nro_ejes_max;
    Peso_max_ton = peso_max_ton;
    Activo = activo;
    
}

}