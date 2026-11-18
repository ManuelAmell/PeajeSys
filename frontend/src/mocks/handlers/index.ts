import { auditoriaHandlers } from './auditoria.handlers';
import { authHandlers } from './auth.handlers';
import { categoriasHandlers } from './categorias.handlers';
import { estacionesHandlers } from './estaciones.handlers';
import { operadoresHandlers } from './operadores.handlers';
import { recaudoHandlers } from './recaudo.handlers';
import { tarifasHandlers } from './tarifas.handlers';
import { telepeajeHandlers } from './telepeaje.handlers';
import { transaccionesHandlers } from './transacciones.handlers';
import { turnosHandlers } from './turnos.handlers';
import { vehiculosHandlers } from './vehiculos.handlers';

export const handlers = [
  ...authHandlers,
  ...estacionesHandlers,
  ...operadoresHandlers,
  ...categoriasHandlers,
  ...tarifasHandlers,
  ...vehiculosHandlers,
  ...telepeajeHandlers,
  ...turnosHandlers,
  ...transaccionesHandlers,
  ...auditoriaHandlers,
  ...recaudoHandlers,
];
