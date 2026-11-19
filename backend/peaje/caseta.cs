
namespace backend;

public class caseta{
    //declaracio de atributosn
public int Id_caseta{get; set;}
public int Id_estacion{get; set;}
public int Numero_carril{get; set;}
public string Tipo_carril{get; set;}
public string Estado{get; set;}

    //constructor

public caseta(int id_caseta, int id_estacion, int numero_carril, string tipo_carril, string estado)
{
    Id_caseta=id_caseta;
    Id_estacion=id_estacion;
    Numero_carril=numero_carril;
    Tipo_carril=tipo_carril;
    Estado=estado;
}


}