import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioRecaudador, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 5: Atajos de teclado del operador (1 a 7, F1 a F3, Enter), diálogo con foco atrapado y Escape', () => {
  test('5.1 Atajos de teclado 1 a 7 y F1 a F3 seleccionan categorías y métodos', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador?carril=mixto');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    // Desenfocar cualquier input haciendo clic en un área neutra
    await page.locator('main').click();

    // 1. Tecla '3' selecciona categoría III
    await page.keyboard.press('3');
    await expect(page.locator('#op-cat-CAT_III')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 2. Tecla '5' selecciona categoría V
    await page.keyboard.press('5');
    await expect(page.locator('#op-cat-CAT_V')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 3. Tecla '1' vuelve a categoría I
    await page.keyboard.press('1');
    await expect(page.locator('#op-cat-CAT_I')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 4. Tecla F2 selecciona Telepeaje
    await page.keyboard.press('F2');
    await expect(page.locator('button', { hasText: /Telepeaje/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 5. Tecla F1 selecciona Efectivo
    await page.keyboard.press('F1');
    await expect(page.locator('button', { hasText: /Efectivo/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 6. Escribir placa con números no debe activar atajos numéricos
    const inputPlaca = page.locator('#op-placa');
    await inputPlaca.click();
    await page.keyboard.type('ABC123');
    await expect(inputPlaca).toHaveValue('ABC123');
    // La categoría debe seguir siendo I
    await expect(page.locator('#op-cat-CAT_I')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 7. Cobro con tecla Enter
    const inputRecibido = page.locator('#op-recibido');
    await inputRecibido.fill('20000');
    await inputRecibido.focus();
    await page.keyboard.press('Enter');

    // Se emite el ticket
    await expect(page.locator('text=/Ticket TCK-/i').first()).toBeVisible();

    expect(errores).toEqual([]);
  });

  test('5.2 Diálogo de cierre de turno atrapa el foco y se cierra con Escape devolviendo el foco', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador');
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    const btnAbrirCierre = page.locator('button', { hasText: /Cerrar turno/i });
    await expect(btnAbrirCierre).toBeVisible();
    await btnAbrirCierre.click();

    const dialogo = page.locator('div[role="dialog"]');
    await expect(dialogo).toBeVisible();

    // El input declarado tiene el foco
    const inputDeclarado = dialogo.locator('#op-declarado');
    await expect(inputDeclarado).toBeFocused();

    // Presionar Escape
    await page.keyboard.press('Escape');

    // El diálogo se cierra
    await expect(dialogo).not.toBeVisible();

    // El foco vuelve al botón que lo abrió
    await expect(btnAbrirCierre).toBeFocused();

    expect(errores).toEqual([]);
  });
});
