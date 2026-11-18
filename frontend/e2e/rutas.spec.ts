import { test, expect } from '@playwright/test';

const usuarioRecaudador = {
  id: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR',
};

const usuarioSupervisor = {
  id: 'EMP-003',
  nombre: 'Juan David Rodríguez Silva',
  rol: 'SUPERVISOR',
};

const usuarioAdmin = {
  id: 'ADMIN-01',
  nombre: 'Administración',
  rol: 'ADMIN',
};

test.describe('Protección y navegación por roles (e2e/rutas.spec.ts)', () => {
  test('usuario no autenticado es redirigido a /login al intentar acceder a rutas protegidas', async ({
    page,
  }) => {
    await page.goto('/operador');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Inicia sesión');

    await page.goto('/supervisor');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Inicia sesión');

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Inicia sesión');
  });

  test('rol RECAUDADOR accede a /operador y es redirigido desde rutas no autorizadas', async ({
    page,
  }) => {
    await page.addInitScript(({ u }) => {
      try {
        sessionStorage.setItem('peajesys_sesion', JSON.stringify(u));
      } catch (e) {
        console.error(e);
      }
    }, { u: usuarioRecaudador });

    // 1. Acceso permitido a /operador
    await page.goto('/operador');
    await expect(page).toHaveURL(/\/operador$/);
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    // 2. Intento de acceso a /supervisor redirige a su ruta por defecto (/operador)
    await page.goto('/supervisor');
    await expect(page).toHaveURL(/\/operador$/);
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');

    // 3. Intento de acceso a /admin redirige a su ruta por defecto (/operador)
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/operador$/);
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');
  });

  test('rol SUPERVISOR accede a /supervisor y es redirigido desde rutas no autorizadas', async ({
    page,
  }) => {
    await page.addInitScript(({ u }) => {
      try {
        sessionStorage.setItem('peajesys_sesion', JSON.stringify(u));
      } catch (e) {
        console.error(e);
      }
    }, { u: usuarioSupervisor });

    // 1. Acceso permitido a /supervisor
    await page.goto('/supervisor');
    await expect(page).toHaveURL(/\/supervisor$/);
    await expect(page.locator('h1')).toHaveText('Supervisión');

    // 2. Intento de acceso a /operador redirige a su ruta por defecto (/supervisor)
    await page.goto('/operador');
    await expect(page).toHaveURL(/\/supervisor$/);
    await expect(page.locator('h1')).toHaveText('Supervisión');
  });

  test('rol ADMIN accede a /admin y es redirigido desde rutas no autorizadas', async ({
    page,
  }) => {
    await page.addInitScript(({ u }) => {
      try {
        sessionStorage.setItem('peajesys_sesion', JSON.stringify(u));
      } catch (e) {
        console.error(e);
      }
    }, { u: usuarioAdmin });

    // 1. Acceso permitido a /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1')).toHaveText('Administración');

    // 2. Intento de acceso a /operador redirige a su ruta por defecto (/admin)
    await page.goto('/operador');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1')).toHaveText('Administración');
  });
});
