import { formatearMoneda } from '@/lib/formato';

/**
 * Lógica de dominio para validación y débito de cuentas de telepeaje RFID.
 * Portada de docs/diseno/claude-design/Operador.dc.html y Supervisor.dc.html:
 * - validación de cuenta, estado y saldo: Operador.dc.html:295-300
 * - clasificación de condición de cuenta: Supervisor.dc.html:288-297
 */

export interface CuentaTelepeajeInfo {
  tag: string;
  saldo: number;
  estado: string;
}

export interface ResultadoTelepeaje {
  puedeDebitar: boolean;
  saldoPosterior: number;
  mensaje: string | null;
}

export type CondicionCuenta = 'SIN SALDO' | 'SALDO CRÍTICO' | 'SALDO SUFICIENTE';

/**
 * Evalúa si una cuenta de telepeaje puede debitar la tarifa requerida.
 * Maneja los tres casos del prototipo:
 * 1. Sin cuenta registrada
 * 2. Cuenta suspendida (ej. ZXC987)
 * 3. Saldo insuficiente (ej. QWE321)
 * 4. Débito exitoso con cálculo de saldo posterior
 * Origen: Operador.dc.html:295-300
 */
export function evaluarSaldoTelepeaje(
  cuenta: CuentaTelepeajeInfo | null | undefined,
  tarifa: number,
): ResultadoTelepeaje {
  if (!cuenta) {
    return {
      puedeDebitar: false,
      saldoPosterior: 0,
      mensaje: 'La placa no tiene cuenta de telepeaje registrada.',
    };
  }

  if (cuenta.estado !== 'ACTIVA') {
    return {
      puedeDebitar: false,
      saldoPosterior: cuenta.saldo,
      mensaje: `La cuenta ${cuenta.tag} está ${cuenta.estado}: cobra en efectivo.`,
    };
  }

  if (cuenta.saldo < tarifa) {
    return {
      puedeDebitar: false,
      saldoPosterior: cuenta.saldo,
      mensaje: `Saldo insuficiente: la cuenta tiene ${formatearMoneda(cuenta.saldo)} y el peaje cuesta ${formatearMoneda(tarifa)}.`,
    };
  }

  return {
    puedeDebitar: true,
    saldoPosterior: cuenta.saldo - tarifa,
    mensaje: null,
  };
}

/**
 * Clasifica la condición de saldo de una cuenta según los criterios del supervisor.
 * Origen: Supervisor.dc.html:288-297
 */
export function determinarCondicionCuenta(saldo: number, estado: string): CondicionCuenta {
  if (saldo <= 0 || estado === 'SUSPENDIDA') {
    return 'SIN SALDO';
  }

  if (saldo < 10000) {
    return 'SALDO CRÍTICO';
  }

  return 'SALDO SUFICIENTE';
}
