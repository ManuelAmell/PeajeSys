import type { TipoCarril } from '@/types';

/**
 * Normaliza texto para búsquedas tolerantes a tildes (Admin.dc.html: sinTildes):
 * quitas diacríticos y pasas a minúsculas.
 */
export function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Convierte una fecha AAAA-MM-DD a DD/MM/AAAA sin pasar por Date,
 * igual que fechaLarga del prototipo, para no depender de la zona horaria.
 */
export function fechaLarga(iso: string): string {
  const partes = String(iso || '').split('-');
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(iso);
}

/** Numeral romano de un código de categoría (CAT_IV -> IV). */
export function romanDeCategoria(codigo: string): string {
  return codigo.replace(/^CAT_/, '');
}

/** Presentación del CHECK tipo_carril del DDL como en el prototipo. */
export function etiquetaTipoCarril(tipo: TipoCarril): string {
  switch (tipo) {
    case 'MANUAL':
      return 'Manual';
    case 'TELEPEAJE_EXCLUSIVO':
      return 'Telepeaje exclusivo';
    case 'MIXTO':
      return 'Mixto';
  }
}

/** Rango de ejes: igual cuando min y max coinciden, rango cuando difieren. */
export function textoEjes(min: number, max: number): string {
  return min === max ? String(min) : `${min} a ${max}`;
}

/** Peso máximo en toneladas con coma decimal; null cuando el DML no lo define. */
export function textoPeso(peso: number | null): string {
  if (peso === null) {
    return 'No definida';
  }
  return `${String(peso).replace('.', ',')} t`;
}

/** Siluetas procesadas copiadas por B0 en public/img. */
export function rutaSilueta(idCategoria: number): string {
  return `/img/cat-${idCategoria}.png`;
}
