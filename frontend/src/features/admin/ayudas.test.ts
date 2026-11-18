import { describe, expect, it } from 'vitest';
import {
  etiquetaTipoCarril,
  fechaLarga,
  romanDeCategoria,
  rutaSilueta,
  sinTildes,
  textoEjes,
  textoPeso,
} from './ayudas';

describe('Ayudas del panel de administración (Admin.dc.html)', () => {
  it('sinTildes quita diacríticos y pasa a minúsculas', () => {
    expect(sinTildes('Díaz Morales')).toBe('diaz morales');
    expect(sinTildes('Rodríguez')).toBe('rodriguez');
    expect(sinTildes('EMP-009')).toBe('emp-009');
  });

  it('fechaLarga convierte AAAA-MM-DD a DD/MM/AAAA sin usar Date', () => {
    expect(fechaLarga('2026-01-01')).toBe('01/01/2026');
    expect(fechaLarga('2026-03-01')).toBe('01/03/2026');
  });

  it('fechaLarga deja pasar valores que no son fecha completa', () => {
    expect(fechaLarga('No definida')).toBe('No definida');
  });

  it('romanDeCategoria convierte el código del DML en numeral romano', () => {
    expect(romanDeCategoria('CAT_I')).toBe('I');
    expect(romanDeCategoria('CAT_IV')).toBe('IV');
    expect(romanDeCategoria('CAT_VII')).toBe('VII');
  });

  it('etiquetaTipoCarril presenta el CHECK del DDL en texto del prototipo', () => {
    expect(etiquetaTipoCarril('MANUAL')).toBe('Manual');
    expect(etiquetaTipoCarril('TELEPEAJE_EXCLUSIVO')).toBe('Telepeaje exclusivo');
    expect(etiquetaTipoCarril('MIXTO')).toBe('Mixto');
  });

  it('textoEjes muestra un rango solo cuando min y max difieren', () => {
    expect(textoEjes(2, 2)).toBe('2');
    expect(textoEjes(3, 4)).toBe('3 a 4');
    expect(textoEjes(6, 10)).toBe('6 a 10');
  });

  it('textoPeso formatea toneladas con coma decimal', () => {
    expect(textoPeso(3.5)).toBe('3,5 t');
    expect(textoPeso(52)).toBe('52 t');
    expect(textoPeso(null)).toBe('No definida');
  });

  it('rutaSilueta apunta a las imágenes procesadas por B0', () => {
    expect(rutaSilueta(1)).toBe('/img/cat-1.png');
    expect(rutaSilueta(7)).toBe('/img/cat-7.png');
  });
});
