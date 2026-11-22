import { Page, expect } from '@playwright/test';

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5180';

export const usuarioRecaudador = {
  id: '2',
  codigo: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR' as const,
};

export const usuarioSupervisor = {
  id: '3',
  codigo: 'EMP-003',
  nombre: 'Juan David Rodríguez Silva',
  rol: 'SUPERVISOR' as const,
};

export const usuarioAdmin = {
  id: 'ADM-001',
  codigo: 'ADM-001',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
};

/**
 * Inyecta la sesión en sessionStorage antes de que cargue el DOM.
 */
export async function inyectarSesion(
  page: Page,
  usuario: typeof usuarioRecaudador | typeof usuarioSupervisor | typeof usuarioAdmin,
) {
  await page.addInitScript(
    ({ u }) => {
      try {
        sessionStorage.setItem('peajesys_sesion', JSON.stringify(u));
      } catch (e) {
        console.error(e);
      }
    },
    { u: usuario },
  );
}

/**
 * Escucha la consola y devuelve un array con los errores capturados.
 * Ignora avisos esperados de Chromium ante peticiones HTTP con códigos de error (403, 404, 409, 500).
 */
export function escucharConsola(page: Page) {
  const errores: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const texto = msg.text();
      // Filtrar respuestas de red esperadas en pruebas de error de Chromium
      if (
        texto.includes('Failed to load resource') ||
        texto.includes('the server responded with a status of')
      ) {
        return;
      }
      errores.push(texto);
    }
  });

  page.on('pageerror', (err) => {
    errores.push(err.message);
  });

  return errores;
}

/**
 * Comprueba que el documento no tenga desborde horizontal.
 */
export async function verificarSinDesborde(page: Page) {
  const tieneDesborde = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(tieneDesborde).toBe(false);
}
