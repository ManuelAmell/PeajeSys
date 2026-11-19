import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioRecaudador, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 4: Cierre de turno con FALTANTE y bloqueo posterior de cobros', () => {
  test('4.1 Turno 9: declarar 10.000 de 10.500 da -500 (FALTANTE), cierra el turno y bloquea los cobros', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    // 1. Abrir diálogo de cierre de turno
    const btnAbrirCierre = page.locator('button', { hasText: /Cerrar turno/i });
    await expect(btnAbrirCierre).toBeVisible();
    await btnAbrirCierre.click();

    const dialogo = page.locator('div[role="dialog"]');
    await expect(dialogo).toBeVisible();

    // 2. Ingresar monto declarado: 10000 (el recaudado en efectivo es 10500)
    const inputDeclarado = dialogo.locator('#op-declarado');
    await inputDeclarado.fill('10000');

    // 3. Verificar diagnóstico en vivo de FALTANTE (−) y diferencia − $ 500
    await expect(dialogo.getByText('FALTANTE (−)')).toBeVisible();
    await expect(dialogo.getByText(/− \$ 500/i)).toBeVisible();

    // 4. Confirmar el cierre del turno
    const btnConfirmar = dialogo.locator('button', { hasText: /Confirmar cierre/i });
    await expect(btnConfirmar).toBeEnabled();
    await btnConfirmar.click();

    // 5. El diálogo se cierra
    await expect(dialogo).not.toBeVisible();

    // 6. La cabecera muestra el estado CERRADO
    await expect(page.locator('text=CERRADO').first()).toBeVisible();

    // 7. El botón de cobro queda deshabilitado reflejando "Turno cerrado"
    const btnCobrar = page.locator('#op-btn-cobrar');
    await expect(btnCobrar).toBeDisabled();
    await expect(btnCobrar).toContainText('Turno cerrado');

    // 8. Mensaje de bloqueo explícito
    await expect(
      page.getByText('Turno cerrado: no se pueden registrar transacciones'),
    ).toBeVisible();

    expect(errores).toEqual([]);
  });
});
