/**
 * Lógica de dominio para validación y normalización de placas vehiculares.
 * Portada de docs/diseno/claude-design/Operador.dc.html:
 * - normalización: línea 403 (reemplaza no alfanuméricos, mayúsculas, máximo 6 caracteres)
 * - validación: línea 276 (expresión regular 3 letras y 3 números)
 * - mensajes de ayuda: líneas 283-288 y 306-308
 */

export interface ResultadoValidacionPlaca {
  valida: boolean;
  error?: string;
}

export interface VehiculoRegistradoInfo {
  categoriaCodigo?: string;
  categoriaRomano?: string;
  estadoCuenta?: string;
}

export interface AyudaPlacaInfo {
  texto: string;
  tipo: 'neutro' | 'error' | 'exito';
}

/**
 * Normaliza el texto de una placa vehicular eliminando espacios y caracteres
 * que no sean letras o números, convirtiendo a mayúsculas y limitando a 6 caracteres.
 * Origen: Operador.dc.html:403
 */
export function normalizarPlaca(input: string): string {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/**
 * Verifica si la placa cumple estrictamente con el formato colombiano oficial
 * de tres letras y tres dígitos numéricos (ej. HKL123).
 * Origen: Operador.dc.html:276
 */
export function esPlacaCompleta(placa: string): boolean {
  return /^[A-Z]{3}[0-9]{3}$/.test(placa);
}

/**
 * Valida la placa y retorna un mensaje de error exacto según el prototipo.
 * Origen: Operador.dc.html:306-308
 */
export function validarPlaca(placa: string): ResultadoValidacionPlaca {
  if (!placa) {
    return {
      valida: false,
      error: 'Escribe la placa del vehículo.',
    };
  }

  if (placa.length === 6 && !esPlacaCompleta(placa)) {
    return {
      valida: false,
      error: 'Formato no válido: deben ser tres letras y tres números.',
    };
  }

  if (!esPlacaCompleta(placa)) {
    return {
      valida: false,
      error: 'La placa debe tener tres letras y tres números.',
    };
  }

  return { valida: true };
}

/**
 * Genera el mensaje contextual de ayuda para el campo de placa según su estado de captura.
 * Origen: Operador.dc.html:283-288
 */
export function obtenerAyudaPlaca(
  placa: string,
  vehiculoRegistrado?: VehiculoRegistradoInfo | null,
): AyudaPlacaInfo {
  if (placa.length === 6 && !esPlacaCompleta(placa)) {
    return {
      texto: 'Formato no válido: deben ser tres letras y tres números.',
      tipo: 'error',
    };
  }

  if (vehiculoRegistrado) {
    const romano = vehiculoRegistrado.categoriaRomano || 'I';
    const tag = vehiculoRegistrado.estadoCuenta || 'ACTIVA';
    return {
      texto: `Vehículo registrado · categoría ${romano} · TAG ${tag}`,
      tipo: 'exito',
    };
  }

  if (esPlacaCompleta(placa)) {
    return {
      texto: 'Vehículo no registrado: elige la categoría por sus ejes.',
      tipo: 'neutro',
    };
  }

  return {
    texto: 'Tres letras y tres números. Si el vehículo está registrado, la categoría se elige sola.',
    tipo: 'neutro',
  };
}
