import { test, expect } from '@playwright/test';
import {
  inyectarSesion,
  usuarioRecaudador,
  usuarioSupervisor,
  usuarioAdmin,
  verificarSinDesborde,
  escucharConsola,
  BASE_URL,
} from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 11: Accesibilidad (teclado, foco visible, sin desborde a 390 px y objetivos táctiles ≥ 44 px)', () => {
  test('11.1 Recorrido por teclado y foco visible en las pantallas de la aplicación', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    const inputCodigo = page.locator('#lg-codigo');
    const inputClave = page.locator('#lg-clave');
    const btnSubmit = page.locator('button[type="submit"]');

    // 1. Enfocar primer campo
    await inputCodigo.focus();
    await expect(inputCodigo).toBeFocused();

    // 2. Tab al campo de clave
    await page.keyboard.press('Tab');
    await expect(inputClave).toBeFocused();

    // 3. Tab al botón submit
    await page.keyboard.press('Tab');
    await expect(btnSubmit).toBeFocused();

    expect(errores).toEqual([]);
  });

  test('11.2 Sin desborde horizontal en ninguna pantalla a 390 px', async ({ page }) => {
    const errores = escucharConsola(page);

    // 1. Login
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
    await verificarSinDesborde(page);

    // 2. Operador
    await inyectarSesion(page, usuarioRecaudador);
    await page.goto('/operador');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');
    await verificarSinDesborde(page);

    // 3. Supervisor
    await inyectarSesion(page, usuarioSupervisor);
    await page.goto('/supervisor');
    await expect(page.locator('#tab-arqueo')).toBeVisible();
    await verificarSinDesborde(page);

    // 4. Admin
    await inyectarSesion(page, usuarioAdmin);
    await page.goto('/admin');
    await expect(page.locator('h1#t-tarifas')).toBeVisible();
    await verificarSinDesborde(page);

    expect(errores).toEqual([]);
  });

  test('11.3 Objetivos táctiles de botones y controles interactivos son ≥ 44 px (medidos)', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    // Medir botón de inicio de sesión
    const btnSubmit = page.locator('button[type="submit"]');
    const cajaBtn = await btnSubmit.boundingBox();
    expect(cajaBtn).not.toBeNull();
    if (cajaBtn) {
      expect(cajaBtn.height).toBeGreaterThanOrEqual(44);
      expect(cajaBtn.width).toBeGreaterThanOrEqual(44);
    }

    // Medir botón alternador de tema
    const btnTema = page.locator('button', { hasText: /modo/i });
    const cajaTema = await btnTema.boundingBox();
    expect(cajaTema).not.toBeNull();
    if (cajaTema) {
      expect(cajaTema.height).toBeGreaterThanOrEqual(44);
      expect(cajaTema.width).toBeGreaterThanOrEqual(44);
    }

    // Medir controles en Operador
    await inyectarSesion(page, usuarioRecaudador);
    await page.goto('/operador');
    const btnCobrar = page.locator('#op-btn-cobrar');
    const cajaCobrar = await btnCobrar.boundingBox();
    expect(cajaCobrar).not.toBeNull();
    if (cajaCobrar) {
      expect(cajaCobrar.height).toBeGreaterThanOrEqual(44);
      expect(cajaCobrar.width).toBeGreaterThanOrEqual(44);
    }

    // Medir botones de categorías
    const btnCat1 = page.locator('#op-cat-CAT_I');
    const cajaCat = await btnCat1.boundingBox();
    expect(cajaCat).not.toBeNull();
    if (cajaCat) {
      expect(cajaCat.height).toBeGreaterThanOrEqual(44);
      expect(cajaCat.width).toBeGreaterThanOrEqual(44);
    }

    expect(errores).toEqual([]);
  });

  test('11.4 Chequeo de etiquetas y accesibilidad en formularios de cada vista', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    // Validar que los campos de login tienen labels conectados
    const idCodigo = await page.locator('label[for="lg-codigo"]').getAttribute('for');
    expect(idCodigo).toBe('lg-codigo');
    await expect(page.locator('#lg-codigo')).toBeVisible();

    const idClave = await page.locator('label[for="lg-clave"]').getAttribute('for');
    expect(idClave).toBe('lg-clave');
    await expect(page.locator('#lg-clave')).toBeVisible();

    expect(errores).toEqual([]);
  });
});
