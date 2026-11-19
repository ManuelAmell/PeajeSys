import { test, expect } from '@playwright/test';

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5180' });

test.describe('Prueba de humo - Esqueleto Frontend PeajeSys', () => {
  test('carga /login, muestra h1, alterna tema, sin errores de consola ni desborde horizontal', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Cargar la vista de inicio de sesión
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verificar que el título H1 existe y es visible
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Inicia sesión');

    // 3. Verificar que el alternador de tema funciona
    const botonTema = page.locator('button', { hasText: /modo/i });
    await expect(botonTema).toBeVisible();

    const temaInicial = await page.locator('html').getAttribute('data-tema');
    await botonTema.click();

    await expect(async () => {
      const temaNuevo = await page.locator('html').getAttribute('data-tema');
      expect(temaNuevo).not.toBe(temaInicial);
    }).toPass({ timeout: 5000 });

    // 4. Verificar que no haya desborde horizontal
    const tieneDesborde = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(tieneDesborde).toBe(false);

    // 5. Verificar que no hubo errores de consola
    expect(consoleErrors).toEqual([]);
  });
});
