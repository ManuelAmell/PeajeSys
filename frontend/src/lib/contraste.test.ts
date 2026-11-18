import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function sRGBtoLin(colorChannel: number): number {
  const c = colorChannel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminanciaRelativa(hex: string): number {
  const limpio = hex.replace('#', '').trim();
  const r = parseInt(limpio.substring(0, 2), 16);
  const g = parseInt(limpio.substring(2, 4), 16);
  const b = parseInt(limpio.substring(4, 6), 16);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

export function calcularRatioContraste(hex1: string, hex2: string): number {
  const l1 = luminanciaRelativa(hex1);
  const l2 = luminanciaRelativa(hex2);
  const masClaro = Math.max(l1, l2);
  const masOscuro = Math.min(l1, l2);
  return Number(((masClaro + 0.05) / (masOscuro + 0.05)).toFixed(2));
}

describe('Auditoría matemática de ratios de contraste WCAG 2.1 (src/index.css)', () => {
  const rutaCss = path.resolve(__dirname, '../index.css');
  const css = fs.readFileSync(rutaCss, 'utf-8');

  // Extraer valores reales definidos en src/index.css
  const extraerToken = (bloque: string, nombre: string): string => {
    const regexBloque =
      bloque === 'claro'
        ? /\[data-tema='claro'\]\s*\{([^}]+)\}/
        : /\[data-tema='oscuro'\]\s*\{([^}]+)\}/;
    const matchBloque = css.match(regexBloque);
    if (!matchBloque) {
      throw new Error(`Bloque de tema ${bloque} no encontrado en index.css`);
    }
    const contenidoBloque = matchBloque[1];
    const regexToken = new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`);
    const matchToken = contenidoBloque.match(regexToken);
    if (!matchToken) {
      throw new Error(`Token ${nombre} no encontrado en bloque ${bloque}`);
    }
    return matchToken[1];
  };

  describe('Tema Claro', () => {
    const fondo = extraerToken('claro', '--fondo');
    const superficie = extraerToken('claro', '--superficie');
    const texto = extraerToken('claro', '--texto');
    const texto2 = extraerToken('claro', '--texto-2');
    const acentoTexto = extraerToken('claro', '--acento-texto');
    const botonPrimarioFondo = '#fcbd17';
    const botonPrimarioTexto = '#1f1d19';

    it('--texto sobre --fondo cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto, fondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--texto sobre --superficie cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto, superficie);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--texto-2 sobre --fondo cumple WCAG AA (>= 4.5:1)', () => {
      const ratio = calcularRatioContraste(texto2, fondo);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('--texto-2 sobre --superficie cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto2, superficie);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--acento-texto sobre --fondo cumple WCAG AA (>= 4.5:1)', () => {
      const ratio = calcularRatioContraste(acentoTexto, fondo);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('--acento-texto sobre --superficie cumple WCAG AA (>= 4.5:1)', () => {
      const ratio = calcularRatioContraste(acentoTexto, superficie);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('Botón primario cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(botonPrimarioTexto, botonPrimarioFondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('Tema Oscuro', () => {
    const fondo = extraerToken('oscuro', '--fondo');
    const superficie = extraerToken('oscuro', '--superficie');
    const texto = extraerToken('oscuro', '--texto');
    const texto2 = extraerToken('oscuro', '--texto-2');
    const acentoTexto = extraerToken('oscuro', '--acento-texto');
    const botonPrimarioFondo = '#fcbd17';
    const botonPrimarioTexto = '#1f1d19';

    it('--texto sobre --fondo cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto, fondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--texto sobre --superficie cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto, superficie);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--texto-2 sobre --fondo cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto2, fondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--texto-2 sobre --superficie cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(texto2, superficie);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--acento-texto sobre --fondo cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(acentoTexto, fondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('--acento-texto sobre --superficie cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(acentoTexto, superficie);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('Botón primario cumple WCAG AAA (>= 7:1)', () => {
      const ratio = calcularRatioContraste(botonPrimarioTexto, botonPrimarioFondo);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });
  });
});
