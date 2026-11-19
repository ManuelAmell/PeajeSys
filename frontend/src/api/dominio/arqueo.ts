import { formatearMoneda } from '@/lib/formato';

/**
 * Lógica de dominio para arqueo de caja y cierre de turno.
 * Portada de docs/diseno/claude-design/Operador.dc.html y Supervisor.dc.html:
 * - cálculo de diferencia: Operador.dc.html:364-365, Supervisor.dc.html:329
 * - diagnósticos CUADRADO, SOBRANTE, FALTANTE: Operador.dc.html:369-373, Supervisor.dc.html:330-332
 */

export type TipoDiagnosticoArqueo = 'CUADRADO' | 'SOBRANTE' | 'FALTANTE';

export interface ResultadoArqueo {
  diagnostico: TipoDiagnosticoArqueo | null;
  diferencia: number | null;
  texto: string;
}

/**
 * Calcula la diferencia neta de arqueo: total declarado en cierre menos total recaudado en efectivo.
 * Positivo: sobrante en caja.
 * Negativo: faltante en caja.
 * Cero: cuadrado exacto.
 * Origen: Operador.dc.html:365, Supervisor.dc.html:329
 */
export function calcularDiferenciaArqueo(declarado: number, recaudado: number): number {
  return Math.round(declarado - recaudado);
}

/**
 * Diagnostica el estado de un turno según su monto declarado y recaudado.
 * Origen: Operador.dc.html:364-374, Supervisor.dc.html:327-333
 */
export function diagnosticarArqueo(
  declarado: number | null | undefined,
  recaudado: number,
): ResultadoArqueo {
  if (declarado === null || declarado === undefined) {
    return {
      diagnostico: null,
      diferencia: null,
      texto: 'EN PROCESO',
    };
  }

  const dif = calcularDiferenciaArqueo(declarado, recaudado);

  if (dif === 0) {
    return {
      diagnostico: 'CUADRADO',
      diferencia: 0,
      texto: 'CUADRADO',
    };
  }

  if (dif > 0) {
    return {
      diagnostico: 'SOBRANTE',
      diferencia: dif,
      texto: `SOBRANTE (+) ${formatearMoneda(dif)}`,
    };
  }

  return {
    diagnostico: 'FALTANTE',
    diferencia: dif,
    texto: `FALTANTE (−) ${formatearMoneda(Math.abs(dif))}`,
  };
}
