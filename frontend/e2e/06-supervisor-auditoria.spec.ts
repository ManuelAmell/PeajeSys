import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioSupervisor, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 6: Auditoría de transacciones (filtro VOID muestra estado vacío)', () => {
  test('6.1 Al seleccionar filtro VOID se muestra el estado vacío correspondiente', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioSupervisor);

    await page.goto('/supervisor');
    await expect(page.locator('#tab-arqueo')).toBeVisible();

    // 1. Clic en pestaña Auditoría
    const tabAuditoria = page.locator('#tab-auditoria');
    await tabAuditoria.click();

    // 2. Esperar que cargue la sección de auditoría
    await expect(page.locator('#panel-auditoria')).toBeVisible();
    await expect(page.locator('h2#t-auditoria')).toHaveText('Auditoría de transacciones');

    // 3. Filtrar por operación VOID
    const selectOperacion = page.locator('#sp-tipo');
    await expect(selectOperacion).toBeVisible();
    await selectOperacion.selectOption('VOID');

    // 4. Verificar estado vacío requerido
    await expect(page.getByText('No hay eventos con ese filtro')).toBeVisible();
    await expect(
      page.getByText('Prueba con otra operación o borra la búsqueda.'),
    ).toBeVisible();

    expect(errores).toEqual([]);
  });
});
