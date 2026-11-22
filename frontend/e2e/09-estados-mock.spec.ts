import { test, expect } from '@playwright/test';
import {
  inyectarSesion,
  usuarioRecaudador,
  usuarioSupervisor,
  usuarioAdmin,
  escucharConsola,
  BASE_URL,
} from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 9: Estados de simulación (?mock=error, ?mock=vacio y ?mock=lento)', () => {
  test('9.1 Login con ?mock=error muestra error de servidor simulado al enviar credenciales', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login?mock=error');

    await page.fill('#lg-codigo', 'EMP-002');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    const alerta = page.locator('#lg-error, [role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('Error de servidor simulado');
    expect(errores).toEqual([]);
  });

  test('9.2 Operador: ?mock=error muestra alerta de error y botón Reintentar', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador?mock=error');

    const alerta = page.getByRole('alert').first();
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('No se pudo cargar el turno');
    await expect(
      alerta.locator('button', { hasText: /Reintentar/i }),
    ).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('9.3 Operador: ?mock=vacio redirige a la pantalla Abrir turno', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioRecaudador);

    await page.goto('/operador?mock=vacio');

    await expect(page).toHaveURL(/\/operador\/abrir-turno/);
    await expect(page.locator('h1')).toHaveText(/Abrir turno/i);
    expect(errores).toEqual([]);
  });

  test('9.4 Supervisor: ?mock=error muestra alerta de error y botón Reintentar', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioSupervisor);

    await page.goto('/supervisor?mock=error');

    const alerta = page.locator('div[role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText(
      'No se pudieron cargar los datos de la estación',
    );
    await expect(
      alerta.locator('button', { hasText: /Reintentar/i }),
    ).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('9.5 Supervisor: ?mock=lento muestra indicador de carga antes de presentar los datos', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioSupervisor);

    await page.goto('/supervisor?mock=lento');

    // Muestra estado de carga
    await expect(
      page.locator('text=Cargando turnos, recaudo y auditoría…'),
    ).toBeVisible();

    // Eventualmente los datos cargan
    await expect(page.locator('#panel-arqueo')).toBeVisible({ timeout: 15000 });
    expect(errores).toEqual([]);
  });

  test('9.6 Admin: ?mock=error muestra alerta de error con opción de reintentar', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioAdmin);

    await page.goto('/admin?mock=error');

    const alerta = page.locator('div[role="alert"]');
    await expect(alerta).toBeVisible();
    await expect(
      alerta.locator('button', { hasText: /Reintentar/i }),
    ).toBeVisible();
    expect(errores).toEqual([]);
  });
});
