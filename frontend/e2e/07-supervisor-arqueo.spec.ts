import { test, expect } from '@playwright/test';
import { inyectarSesion, usuarioSupervisor, escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 7: Supervisión y control de arqueo (Turno 5 muestra SOBRANTE y discrepancia de conciliación)', () => {
  test('7.1 El turno 5 muestra diagnóstico SOBRANTE (+) $ 5.000 y discrepancia No concilia: $ 371.500 sin pasos', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioSupervisor);

    await page.goto('/supervisor');
    await expect(page.locator('#tab-arqueo')).toBeVisible();
    await expect(page.locator('#panel-arqueo')).toBeVisible();

    // 1. Localizar la fila del turno 5 por data-testid
    const filaTurno5 = page.locator('[data-testid="fila-turno-5"]');
    await expect(filaTurno5).toBeVisible();

    // 2. Verificar datos del turno y operador
    await expect(filaTurno5).toContainText('Laura Patricia Díaz Morales');
    await expect(filaTurno5).toContainText('$ 420.000');
    await expect(filaTurno5).toContainText('$ 48.500');
    await expect(filaTurno5).toContainText('$ 425.000');

    // 3. Verificar diagnóstico de arqueo: SOBRANTE (+) $ 5.000
    await expect(filaTurno5).toContainText('SOBRANTE (+) $ 5.000');

    // 4. Verificar conciliación financiera: No concilia: $ 371.500 sin pasos
    await expect(filaTurno5).toContainText('No concilia: $ 371.500 sin pasos');

    expect(errores).toEqual([]);
  });
});
