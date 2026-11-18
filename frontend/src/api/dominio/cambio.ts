import { formatearMoneda } from '@/lib/formato';

/**
 * Lógica de dominio para cálculo de cambio y validación de cobro en efectivo.
 * Portada de docs/diseno/claude-design/Operador.dc.html:
 * - validación y faltante: líneas 291-294
 * - cálculo y estados visuales: líneas 338-344
 */

export interface ResultadoCambio {
  esSuficiente: boolean;
  cambio: number;
  faltante: number;
  mensaje: string | null;
}

/**
 * Valida el dinero en efectivo entregado por el usuario frente a la tarifa a cobrar
 * y calcula el cambio o el faltante con el mensaje correspondiente.
 * Origen: Operador.dc.html:291-294, 338-344
 */
export function calcularCambio(recibido: number, tarifa: number): ResultadoCambio {
  if (!recibido || recibido <= 0) {
    return {
      esSuficiente: false,
      cambio: 0,
      faltante: tarifa,
      mensaje: 'Ingresa el valor recibido.',
    };
  }

  if (recibido < tarifa) {
    const faltante = tarifa - recibido;
    return {
      esSuficiente: false,
      cambio: 0,
      faltante,
      mensaje: `Faltan ${formatearMoneda(faltante)} para cubrir el peaje.`,
    };
  }

  const cambio = recibido - tarifa;
  return {
    esSuficiente: true,
    cambio,
    faltante: 0,
    mensaje: null,
  };
}
