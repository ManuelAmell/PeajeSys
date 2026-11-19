import type {
  AuditoriaTransaccion,
  Caseta,
  CategoriaVehiculo,
  CuentaTelepeaje,
  DetallePagoTelepeaje,
  EstacionPeaje,
  Operador,
  Tarifa,
  TransaccionPeaje,
  Turno,
  Vehiculo,
} from '@/types';

/**
 * Forma estructural de la semilla de datos de PeajeSys para MSW.
 * Contiene colecciones tipadas para las 11 tablas del modelo relacional.
 */
export interface Semilla {
  estaciones: EstacionPeaje[];
  casetas: Caseta[];
  operadores: Operador[];
  turnos: Turno[];
  categorias: CategoriaVehiculo[];
  tarifas: Tarifa[];
  vehiculos: Vehiculo[];
  cuentas_telepeaje: CuentaTelepeaje[];
  transacciones: TransaccionPeaje[];
  detalles_telepeaje: DetallePagoTelepeaje[];
  auditorias: AuditoriaTransaccion[];
}
