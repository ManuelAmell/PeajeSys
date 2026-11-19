import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioRecaudador, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 3: Telepeaje en carril mixto (?carril=mixto)', () => {
  test('3.1 QWE321 saldo insuficiente y ZXC987 cuenta suspendida bloquean; HKL123 con saldo cobra y descuenta', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    // Navegar con ?carril=mixto
    await page.goto('/operador?carril=mixto');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');
    await expect(page.locator('text=mixto (dato de prueba)')).toBeVisible();

    const inputPlaca = page.locator('#op-placa');
    const btnTelepeaje = page.locator('button', { hasText: /Telepeaje/i });
    const btnCobrar = page.locator('#op-btn-cobrar');

    // 1. Caso QWE321: saldo insuficiente (Cat III tarifa 15.300, saldo TAG 8.000)
    await inputPlaca.fill('QWE321');
    await btnTelepeaje.click();
    await expect(page.locator('text=/Saldo insuficiente/i').first()).toBeVisible();
    await expect(btnCobrar).toBeDisabled();

    // 2. Caso ZXC987: cuenta suspendida
    await inputPlaca.fill('');
    await inputPlaca.fill('ZXC987');
    await btnTelepeaje.click();
    await expect(page.locator('text=/está SUSPENDIDA/i').first()).toBeVisible();
    await expect(btnCobrar).toBeDisabled();

    // 3. Caso HKL123: saldo suficiente (Cat I tarifa 10.500, saldo TAG 150.000)
    await inputPlaca.fill('');
    await inputPlaca.fill('HKL123');
    await btnTelepeaje.click();

    // Esperar detalles del tag RFID y saldos
    await expect(page.locator('text=TAG-COL-9900112233')).toBeVisible();
    await expect(page.locator('text=$ 150.000')).toBeVisible();
    await expect(page.locator('text=$ 139.500')).toBeVisible();

    // Cobro habilitado
    await expect(btnCobrar).toBeEnabled();
    await expect(btnCobrar).toContainText('Cobrar $ 10.500');

    // Ejecutar cobro
    await btnCobrar.click();

    // Confirmación emitida con saldo restante
    await expect(page.getByText('saldo restante $ 139.500')).toBeVisible();

    expect(errores).toEqual([]);
  });
});
