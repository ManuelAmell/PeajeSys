import { test, expect } from '@playwright/test';
import { escucharConsola, BASE_URL } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 1: Autenticación e inicio de sesión por rol (5 casos obligatorios + código inexistente)', () => {
  test('1.1 EMP-002 entra al operador con turno abierto', async ({ page }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'EMP-002');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    // Muestra tarjeta «Ir a …»
    await expect(page.locator('text=Hola, María Fernanda')).toBeVisible();
    const btnIr = page.locator('button', {
      hasText: /Ir a la terminal de cobro/i,
    });
    await expect(btnIr).toBeVisible();
    await btnIr.click();

    // Redirige a /operador
    await expect(page).toHaveURL(/\/operador$/);
    await expect(page.locator('h1')).toHaveText('Terminal de cobro');
    expect(errores).toEqual([]);
  });

  test('1.2 EMP-001 operador sin turno asignado inicia sesión y va a la pantalla Abrir turno', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'EMP-001');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    // Tarjeta "Ir a..." hacia Abrir turno
    const botonIr = page
      .locator('[role="status"]')
      .getByRole('button', { name: /abrir turno/i });
    await expect(botonIr).toBeVisible();
    await botonIr.click();

    await expect(page).toHaveURL(/\/operador\/abrir-turno/);
    await expect(page.locator('h1')).toHaveText(/Abrir turno/i);
    expect(errores).toEqual([]);
  });

  test('1.3 EMP-009 operador INACTIVO se rechaza con mensaje correspondiente', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'EMP-009');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    // Mensaje de rechazo: usuario inactivo
    const errorAlerta = page.locator('#lg-error, [role="alert"]');
    await expect(errorAlerta).toBeVisible();
    await expect(errorAlerta).toContainText('está INACTIVO');
    await expect(page).toHaveURL(/\/login/);
    expect(errores).toEqual([]);
  });

  test('1.4 EMP-003 entra al supervisor', async ({ page }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'EMP-003');
    await page.fill('#lg-clave', 'prueba123');
    await page.click('button[type="submit"]');

    // Muestra tarjeta «Ir a …»
    await expect(page.locator('text=Hola, Juan David')).toBeVisible();
    const btnIr = page.locator('button', {
      hasText: /Ir al panel del supervisor/i,
    });
    await expect(btnIr).toBeVisible();
    await btnIr.click();

    // Redirige a /supervisor
    await expect(page).toHaveURL(/\/supervisor$/);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('#tab-arqueo')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('1.5 ADM-001 entra a la administración', async ({ page }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'ADM-001');
    await page.fill('#lg-clave', 'admin123');
    await page.click('button[type="submit"]');

    // Muestra tarjeta «Ir a …»
    await expect(page.locator('text=Hola, Manuel Amell')).toBeVisible();
    const btnIr = page.locator('button', {
      hasText: /Ir a la administración/i,
    });
    await expect(btnIr).toBeVisible();
    await btnIr.click();

    // Redirige a /admin
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1')).toHaveText('Tarifas por estación');
    expect(errores).toEqual([]);
  });

  test('1.6 Código de empleado inexistente se rechaza con mensaje de error', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await page.goto('/login');

    await page.fill('#lg-codigo', 'EMP-999');
    await page.fill('#lg-clave', 'cualquiera');
    await page.click('button[type="submit"]');

    const errorAlerta = page.locator('#lg-error, [role="alert"]');
    await expect(errorAlerta).toBeVisible();
    await expect(errorAlerta).toContainText(
      'No existe un empleado con el código EMP-999',
    );
    await expect(page).toHaveURL(/\/login/);
    expect(errores).toEqual([]);
  });
});
