import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioRecaudador, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 2: Cobro en efectivo con cambio exacto y retorno de foco', () => {
  test('2.1 GHJ357, categoría I, billete de 20.000: cambio 9.500, aparece el paso, sube el recaudado y foco vuelve a la placa', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    const inputPlaca = page.locator('#op-placa');
    await expect(inputPlaca).toBeVisible();

    // 1. Escribir placa GHJ357
    await inputPlaca.fill('GHJ357');

    // 2. Ingresar billete de 20.000
    const inputRecibido = page.locator('#op-recibido');
    await inputRecibido.fill('20000');

    // 3. Verificar cálculo en vivo del cambio: 20.000 - 10.500 = 9.500
    await expect(page.locator('text=Cambio a entregar')).toBeVisible();
    await expect(page.locator('strong:has-text("$ 9.500")')).toBeVisible();

    // 4. Botón de cobro habilitado
    const btnCobrar = page.locator('#op-btn-cobrar');
    await expect(btnCobrar).toBeEnabled();
    await expect(btnCobrar).toContainText('Cobrar $ 10.500');

    // 5. Ejecutar cobro
    await btnCobrar.click();

    // 6. Verificar confirmación del paso registrado
    await expect(page.locator('text=GHJ357 · Cat. I · EFECTIVO')).toBeVisible();
    await expect(page.locator('text=/Ticket TCK-/i').first()).toBeVisible();

    // 7. Verificar que sube el recaudado en efectivo (pasa a 21.000 en la caja)
    await expect(page.locator('aside')).toContainText('$ 21.000');

    // 8. Verificar que los campos se limpiaron y el foco volvió a la placa
    await expect(inputPlaca).toHaveValue('');
    await expect(inputRecibido).toHaveValue('');
    await expect(inputPlaca).toBeFocused();

    expect(errores).toEqual([]);
  });
});
