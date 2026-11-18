import { formatearMoneda } from '@/lib/formato';

/**
 * Lógica de dominio para validación y auditoría de tarifas de peaje.
 * Portada de docs/diseno/claude-design/Admin.dc.html:
 * - validación: líneas 367-374
 * - generación de historial: líneas 377-381
 */

export interface DatosTarifaValidacion {
  monto: number;
  resolucion_legal: string;
  fecha_inicio_vigencia: string;
  fecha_fin_vigencia?: string | null;
}

export interface ResultadoValidacionTarifa {
  valida: boolean;
  campo?: 'monto' | 'resolucion_legal' | 'fecha_inicio_vigencia' | 'fecha_fin_vigencia';
  error?: string;
}

export interface EntradaHistorialTarifa {
  titulo: string;
  cambio: string;
  meta: string;
}

/**
 * Valida los datos requeridos para registrar o actualizar una tarifa.
 * Origen: Admin.dc.html:370-374
 */
export function validarTarifa(datos: DatosTarifaValidacion): ResultadoValidacionTarifa {
  const monto = Math.round(datos.monto || 0);

  if (monto <= 0) {
    return {
      valida: false,
      campo: 'monto',
      error: 'El monto debe ser mayor que 0.',
    };
  }

  if (!datos.resolucion_legal || !datos.resolucion_legal.trim()) {
    return {
      valida: false,
      campo: 'resolucion_legal',
      error: 'Indica la resolución que autoriza la tarifa.',
    };
  }

  if (!datos.fecha_inicio_vigencia || !datos.fecha_inicio_vigencia.trim()) {
    return {
      valida: false,
      campo: 'fecha_inicio_vigencia',
      error: 'Indica desde qué fecha rige.',
    };
  }

  if (
    datos.fecha_fin_vigencia &&
    datos.fecha_fin_vigencia.trim() &&
    datos.fecha_fin_vigencia < datos.fecha_inicio_vigencia
  ) {
    return {
      valida: false,
      campo: 'fecha_fin_vigencia',
      error: 'La fecha de fin debe ser posterior o igual a la de inicio.',
    };
  }

  return { valida: true };
}

/**
 * Genera la entrada de auditoría que documenta el cambio de tarifa en el historial.
 * Origen: Admin.dc.html:377-381
 */
export function generarHistorialTarifa(
  tarifaAnterior: { monto: number } | null | undefined,
  tarifaNueva: { monto: number; resolucion: string; admin: string },
  estacionNombre: string,
  categoriaRomano: string,
  horaActual?: string,
): EntradaHistorialTarifa {
  const hora =
    horaActual ||
    (() => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    })();

  const antesTxt = tarifaAnterior ? formatearMoneda(tarifaAnterior.monto) : 'Sin tarifa';
  const nuevoTxt = formatearMoneda(tarifaNueva.monto);

  return {
    titulo: `${estacionNombre} · categoría ${categoriaRomano}`,
    cambio: `${antesTxt} -> ${nuevoTxt}`,
    meta: `${hora} · ${tarifaNueva.admin} · ${tarifaNueva.resolucion.trim()}`,
  };
}
