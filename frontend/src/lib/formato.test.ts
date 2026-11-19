import { describe, it, expect } from 'vitest';
import {
  formatearMoneda,
  formatearFecha,
  formatearHora,
  formatearFechaLarga,
} from './formato';

describe('Utilidades de formato (formato.ts)', () => {
  describe('formatearMoneda', () => {
    it('formatea montos positivos en pesos colombianos con símbolo $ y separador de miles', () => {
      expect(formatearMoneda(48500)).toBe('$ 48.500');
      expect(formatearMoneda(100000)).toBe('$ 100.000');
      expect(formatearMoneda(10500)).toBe('$ 10.500');
    });

    it('formatea cero correctamente', () => {
      expect(formatearMoneda(0)).toBe('$ 0');
    });

    it('formatea montos negativos con signo menos', () => {
      expect(formatearMoneda(-2000)).toBe('− $ 2.000');
    });

    it('permite incluir signo explícito positivo cuando se solicita', () => {
      expect(formatearMoneda(5000, { conSigno: true })).toBe('+ $ 5.000');
      expect(formatearMoneda(-2000, { conSigno: true })).toBe('− $ 2.000');
      expect(formatearMoneda(0, { conSigno: true })).toBe('$ 0');
    });

    it('maneja valores no finitos devolviendo $ 0', () => {
      expect(formatearMoneda(NaN)).toBe('$ 0');
      expect(formatearMoneda(Infinity)).toBe('$ 0');
    });
  });

  describe('formatearFecha', () => {
    it('formatea fechas en formato DD/MM/YYYY para es-CO', () => {
      const fecha = new Date(2026, 9, 1); // 1 de octubre de 2026
      expect(formatearFecha(fecha)).toBe('01/10/2026');
    });

    it('acepta strings ISO de fecha', () => {
      expect(formatearFecha('2026-10-06T12:00:00Z')).toMatch(
        /\d{2}\/\d{2}\/2026/,
      );
    });

    it('devuelve cadena vacía si la fecha es inválida', () => {
      expect(formatearFecha('fecha-invalida')).toBe('');
    });
  });

  describe('formatearHora', () => {
    it('formatea horas en formato HH:mm de 24 horas', () => {
      const fecha = new Date(2026, 9, 1, 14, 30);
      expect(formatearHora(fecha)).toBe('14:30');
    });

    it('rellena con ceros los minutos y horas menores a 10', () => {
      const fecha = new Date(2026, 9, 1, 8, 5);
      expect(formatearHora(fecha)).toBe('08:05');
    });

    it('devuelve cadena vacía si la fecha es inválida', () => {
      expect(formatearHora('fecha-invalida')).toBe('');
    });
  });

  describe('formatearFechaLarga', () => {
    it('formatea la fecha con día de la semana y mes en español', () => {
      const fecha = new Date(2026, 9, 1); // 1 de octubre de 2026 es jueves
      const resultado = formatearFechaLarga(fecha);
      expect(resultado).toContain('octubre');
      expect(resultado).toContain('2026');
    });

    it('devuelve cadena vacía si la fecha es inválida', () => {
      expect(formatearFechaLarga('fecha-invalida')).toBe('');
    });
  });
});
