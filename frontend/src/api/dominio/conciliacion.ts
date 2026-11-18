import { formatearMoneda } from '@/lib/formato';

/**
 * Lógica de dominio para conciliación entre el total recaudado del turno
 * y la suma de transacciones en efectivo registradas en los pasos.
 * Portada de docs/diseno/claude-design/Supervisor.dc.html:334-340
 */

export interface ResultadoConciliacion {
  concilia: boolean;
  diferencia: number;
  mensaje: string;
}

/**
 * Evalúa si el efectivo registrado en el turno concilia exactamente con la suma
 * de los montos de transacciones individuales en efectivo.
 * Origen: Supervisor.dc.html:334-340
 */
export function conciliarTurnoPasos(
  totalRecaudadoEfectivoTurno: number,
  sumaTransaccionesEfectivo: number,
): ResultadoConciliacion {
  const concilia = totalRecaudadoEfectivoTurno === sumaTransaccionesEfectivo;
  const diferencia = totalRecaudadoEfectivoTurno - sumaTransaccionesEfectivo;

  if (concilia) {
    return {
      concilia: true,
      diferencia: 0,
      mensaje: 'Concilia',
    };
  }

  return {
    concilia: false,
    diferencia,
    mensaje: `No concilia: ${formatearMoneda(Math.abs(diferencia))} sin pasos`,
  };
}
