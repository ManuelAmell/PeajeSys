import { test, expect } from '@playwright/test';
import {
  inyectarSesion,
  usuarioAdmin,
  verificarSinDesborde,
  escucharConsola,
  BASE_URL,
} from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Caso 14: El administrador da de alta operadores con contraseña', () => {
  test('14.1 Crea un operador con contraseña, aparece en la lista y ese operador puede iniciar sesión', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioAdmin);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Personal', exact: true }).click();
    await expect(page.locator('h1#t-personal')).toHaveText('Personal');

    await page.getByRole('button', { name: 'Nuevo operador' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo operador' });
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel('Documento').fill('1099000111');
    await dialogo.getByLabel('Nombres').fill('Ana María');
    await dialogo.getByLabel('Apellidos').fill('Pérez Ruiz');
    await dialogo.getByLabel('Código de empleado').fill('REC-010');
    await dialogo.getByLabel('Rol').selectOption({ label: 'Recaudador' });
    await dialogo
      .getByLabel('Contraseña', { exact: true })
      .fill('Clave-segura1');
    await dialogo.getByLabel('Confirmar contraseña').fill('Clave-distinta1');
    await dialogo.getByRole('button', { name: 'Crear operador' }).click();
    await expect(
      dialogo.getByText('Las contraseñas no coinciden.'),
    ).toBeVisible();

    await dialogo.getByLabel('Confirmar contraseña').fill('Clave-segura1');
    await dialogo.getByRole('button', { name: 'Crear operador' }).click();
    await expect(dialogo).not.toBeVisible();
    await expect(page.getByText('REC-010')).toBeVisible();
    await expect(page.getByText('Ana María Pérez Ruiz')).toBeVisible();
    await verificarSinDesborde(page);

    // Cierra la sesión desde la propia app (recargar la página reiniciaría la BD simulada).
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.locator('#lg-codigo')).toBeVisible();
    await page.fill('#lg-codigo', 'REC-010');
    await page.fill('#lg-clave', 'Clave-segura1');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Hola,')).toBeVisible();

    expect(errores).toEqual([]);
  });

  test('14.2 El diálogo cierra con Esc, muestra el 409 de código duplicado y la contraseña se puede mostrar', async ({
    page,
  }) => {
    const errores = escucharConsola(page);
    await inyectarSesion(page, usuarioAdmin);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Personal', exact: true }).click();

    const abrir = page.getByRole('button', { name: 'Nuevo operador' });
    await abrir.click();
    await expect(
      page.getByRole('dialog', { name: 'Nuevo operador' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(abrir).toBeFocused();

    await abrir.click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo operador' });
    await dialogo.getByLabel('Documento').fill('777000111');
    await dialogo.getByLabel('Nombres').fill('Repetido');
    await dialogo.getByLabel('Apellidos').fill('Prueba');
    await dialogo.getByLabel('Código de empleado').fill('EMP-001');
    await dialogo
      .getByLabel('Contraseña', { exact: true })
      .fill('Clave-segura1');
    await dialogo.getByLabel('Confirmar contraseña').fill('Clave-segura1');
    await expect(
      dialogo.getByLabel('Contraseña', { exact: true }),
    ).toHaveAttribute('type', 'password');
    await dialogo.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(
      dialogo.getByLabel('Contraseña', { exact: true }),
    ).toHaveAttribute('type', 'text');
    await dialogo.getByRole('button', { name: 'Crear operador' }).click();

    await expect(dialogo.getByRole('alert')).toContainText(
      'Ya existe un operador',
    );
    await expect(dialogo).toBeVisible();
    await verificarSinDesborde(page);

    expect(errores).toEqual([]);
  });
});
