import { test, expect } from '@playwright/test';
import { escucharConsola } from './helpers';

test.describe('Caso 12: Apertura de turno (REC-002 sin turno abre turno y accede a la terminal)', () => {
  test('12.1 REC-002 inicia sesión sin turno, abre turno en caseta 1 y accede a la terminal', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    // Rellenar login con REC-002 (Camilo Guzmán)
    await page.fill('#lg-codigo', 'REC-002');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    // Tarjeta "Ir a..." hacia Abrir turno
    const botonIr = page
      .locator('[role="status"]')
      .getByRole('button', { name: /abrir turno/i });
    await expect(botonIr).toBeVisible();
    await botonIr.click();

    await expect(page).toHaveURL(/\/operador\/abrir-turno/);
    await expect(page.locator('h1')).toHaveText(/Abrir turno/i);

    // Seleccionar caseta 1 y fondo
    await page.selectOption('#at-caseta', '1');
    await page.fill('#at-fondo', '100000');

    // Clic en Abrir turno
    await page.click('button[type="submit"]');

    // Debe navegar a la terminal de cobro
    await expect(page).toHaveURL(/\/operador$/);
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    expect(errores).toEqual([]);
  });
});
