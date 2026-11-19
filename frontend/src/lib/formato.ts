export interface OpcionesMoneda {
  conSigno?: boolean;
}

/**
 * Formatea un número en pesos colombianos como en los diseños de PeajeSys:
 * Ejemplos:
 * 48500 -> "$ 48.500"
 * 0 -> "$ 0"
 * -2000 -> "− $ 2.000"
 * 5000 (conSigno: true) -> "+ $ 5.000"
 */
export function formatearMoneda(
  monto: number,
  opciones: OpcionesMoneda = {},
): string {
  if (!Number.isFinite(monto)) {
    return '$ 0';
  }

  const esNegativo = monto < 0;
  const esPositivo = monto > 0;
  const absoluto = Math.abs(Math.round(monto));

  // Formato con separadores de miles '.'
  const partes = absoluto.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (esNegativo) {
    return `− $ ${partes}`;
  }

  if (opciones.conSigno && esPositivo) {
    return `+ $ ${partes}`;
  }

  return `$ ${partes}`;
}

function normalizarFecha(fecha: Date | string | number): Date | null {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

/**
 * Formatea una fecha como DD/MM/YYYY (es-CO).
 */
export function formatearFecha(fecha: Date | string | number): string {
  const d = normalizarFecha(fecha);
  if (!d) return '';

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

/**
 * Formatea una hora en formato HH:mm (24 horas).
 */
export function formatearHora(fecha: Date | string | number): string {
  const d = normalizarFecha(fecha);
  if (!d) return '';

  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');

  return `${horas}:${minutos}`;
}

/**
 * Formatea una fecha larga con día de la semana y mes en español (es-CO).
 */
export function formatearFechaLarga(fecha: Date | string | number): string {
  const d = normalizarFecha(fecha);
  if (!d) return '';

  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}
