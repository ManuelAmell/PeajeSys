import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioAdmin, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 8: Administración de tarifas (validación de monto 0 y guardado válido con historial)', () => {
  test('8.1 Monto 0 se rechaza con mensaje de error; monto válido 11.200 se guarda y aparece en el historial', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioAdmin);

    await page.goto('/admin');
    await expect(page.locator('h1#t-tarifas')).toHaveText('Tarifas por estación');

    // 1. Abrir diálogo de edición de tarifa para categoría I
    const btnEditar = page.locator('button[aria-label="Editar tarifa de la categoría I"]');
    await expect(btnEditar).toBeVisible();
    await btnEditar.click();

    const dialogo = page.locator('div[role="dialog"]');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('#t-editar')).toContainText('Editar tarifa · categoría I');

    // 2. Intentar guardar con monto 0
    const inputMonto = dialogo.locator('#ad-monto');
    await inputMonto.fill('0');
    const btnGuardar = dialogo.locator('button', { hasText: 'Guardar tarifa' });
    await btnGuardar.click();

    // 3. Verificar rechazo con mensaje del esquema
    await expect(dialogo.getByText('El monto debe ser mayor que 0')).toBeVisible();
    await expect(dialogo).toBeVisible();

    // 4. Ingresar un monto válido: 11200 y fecha desde 2026-03-01
    await inputMonto.fill('11200');
    const inputDesde = dialogo.locator('#ad-desde');
    await inputDesde.fill('2026-03-01');

    // 5. Guardar tarifa
    await btnGuardar.click();

    // 6. Diálogo se cierra y aparece mensaje de confirmación
    await expect(dialogo).not.toBeVisible();
    await expect(
      page.getByText('Tarifa de la categoría I en Estación Gambote guardada: $ 11.200.'),
    ).toBeVisible();

    // 7. Aparece en el historial de cambios
    await expect(page.locator('#t-historial')).toHaveText('Historial de cambios');
    await expect(page.getByText('$ 10.500 -> $ 11.200')).toBeVisible();

    expect(errores).toEqual([]);
  });
});
