import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioRecaudador, escucharConsola, verificarSinDesborde, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 13: anulación de una transacción desde la terminal', () => {
  test('13.1 cobra en efectivo, anula con motivo, ve la fila Anulada y el recaudo actualizado', async ({ page }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);
    await page.goto('/operador');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    await page.locator('#op-placa').fill('GHJ357');
    await page.locator('#op-recibido').fill('20000');
    await page.locator('#op-btn-cobrar').click();
    await expect(page.locator('aside')).toContainText('$ 21.000');

    await page.getByRole('button', { name: /Transacciones del turno/ }).click();
    const filas = page.locator('[data-testid^="fila-transaccion-"]');
    const nueva = filas.filter({ hasText: 'GHJ357' }).filter({ has: page.getByRole('button', { name: /Anular/ }) }).first();
    await expect(nueva).toBeVisible();
    await verificarSinDesborde(page);

    await nueva.getByRole('button', { name: /Anular/ }).click();
    const dialogo = page.getByRole('dialog', { name: /Anular transacción/ });
    await expect(dialogo.getByLabel('Motivo')).toBeFocused();
    await dialogo.getByRole('button', { name: 'Anular transacción', exact: true }).click();
    await expect(dialogo.getByRole('alert')).toBeVisible();
    await dialogo.getByLabel('Motivo').fill('Cobro duplicado por error');
    await dialogo.getByRole('button', { name: 'Anular transacción', exact: true }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.locator('[data-testid^="fila-transaccion-"]').filter({ hasText: 'Anulada' })).toHaveCount(1);
    await expect(page.locator('aside')).toContainText('$ 10.500');
    await expect(page.locator('aside')).not.toContainText('$ 21.000');
    expect(errores).toEqual([]);
  });
});
