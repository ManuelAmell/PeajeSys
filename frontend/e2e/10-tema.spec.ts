import { test, expect } from '@playwright/test';
import { escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 10: Alternancia y persistencia de tema (claro/oscuro y prefers-color-scheme)', () => {
  test('10.1 El botón de tema alterna entre claro y oscuro, persiste en localStorage y tras recargar', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    const html = page.locator('html');
    const btnTema = page.locator('button', { hasText: /modo/i });
    await expect(btnTema).toBeVisible();

    const temaInicial = await html.getAttribute('data-tema');
    expect(['claro', 'oscuro']).toContain(temaInicial);

    // Alternar tema
    await btnTema.click();

    // Esperar cambio de atributo data-tema
    await expect(async () => {
      const temaNuevo = await html.getAttribute('data-tema');
      expect(temaNuevo).not.toBe(temaInicial);
    }).toPass({ timeout: 5000 });

    const temaGuardado = await page.evaluate(() => localStorage.getItem('peajesys_tema'));
    expect(['claro', 'oscuro']).toContain(temaGuardado);
    expect(temaGuardado).not.toBe(temaInicial);

    // Recargar la página y verificar persistencia
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();

    const temaPostRecarga = await html.getAttribute('data-tema');
    expect(temaPostRecarga).toBe(temaGuardado);

    expect(errores).toEqual([]);
  });

  test('10.2 Respeta prefers-color-scheme del sistema cuando no hay preferencia guardada', async ({
    browser,
  }) => {
    // Probar con preferencia oscura
    const contextDark = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 1280, height: 800 },
    });
    const pageDark = await contextDark.newPage();
    await pageDark.goto(BASE_URL + '/login');
    await expect(pageDark.locator('h1')).toBeVisible();
    const temaDark = await pageDark.locator('html').getAttribute('data-tema');
    expect(temaDark).toBe('oscuro');
    await contextDark.close();

    // Probar con preferencia clara
    const contextLight = await browser.newContext({
      colorScheme: 'light',
      viewport: { width: 1280, height: 800 },
    });
    const pageLight = await contextLight.newPage();
    await pageLight.goto(BASE_URL + '/login');
    await expect(pageLight.locator('h1')).toBeVisible();
    const temaLight = await pageLight.locator('html').getAttribute('data-tema');
    expect(temaLight).toBe('claro');
    await contextLight.close();
  });
});
