import { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderConProveedores, screen } from '@/test/render';
import { server } from '@/mocks/server';
import { Cabecera } from '@/components/layout/Cabecera';
import { FormularioLogin } from './FormularioLogin';

function renderConRutas(
  ui: ReactElement,
  opciones: Parameters<typeof renderConProveedores>[1] = {},
) {
  return renderConProveedores(
    <Routes>
      <Route path="/login" element={ui} />
      <Route
        path="/operador"
        element={
          <section>
            <h1>Terminal de cobro</h1>
            <Cabecera />
          </section>
        }
      />
      <Route
        path="/supervisor"
        element={
          <section>
            <h1>Supervisión</h1>
            <Cabecera />
          </section>
        }
      />
      <Route
        path="/admin"
        element={
          <section>
            <h1>Administración</h1>
            <Cabecera />
          </section>
        }
      />
    </Routes>,
    { initialEntries: ['/login'], ...opciones },
  );
}

async function escribirCredenciales(codigo: string, clave: string) {
  renderConRutas(<FormularioLogin />);
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Código de empleado'), codigo);
  await usuario.type(screen.getByLabelText('Contraseña'), clave);
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
  return usuario;
}

describe('FormularioLogin (inicio de sesión con MSW y semilla real)', () => {
  it('EMP-002 recaudadora con turno 9 entra y va a /operador', async () => {
    const usuario = await escribirCredenciales('EMP-002', 'prueba');

    const tarjeta = await screen.findByRole('status');
    expect(tarjeta).toHaveTextContent('Hola, María Fernanda');
    expect(tarjeta).toHaveTextContent('Recaudador · EMP-002');

    await usuario.click(
      screen.getByRole('button', {
        name: 'Ir a la terminal de cobro (turno 9)',
      }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Terminal de cobro' }),
    ).toBeInTheDocument();

    const sesion = JSON.parse(
      window.sessionStorage.getItem('peajesys_sesion') ?? 'null',
    );
    expect(sesion).toMatchObject({
      rol: 'RECAUDADOR',
      codigo: 'EMP-002',
      nombre: 'María Fernanda López Martínez',
    });
  });

  it('EMP-001 recaudador sin turno abierto muestra el aviso del prototipo y no entra', async () => {
    await escribirCredenciales('EMP-001', 'prueba');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'Carlos Alberto Gómez Pérez no tiene un turno abierto. El supervisor debe asignarle una caseta antes de cobrar.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Código de empleado')).toHaveFocus();
    expect(screen.getByLabelText('Código de empleado')).toBeInvalid();
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
  });

  it('EMP-009 usuario INACTIVO muestra el error del prototipo y no entra', async () => {
    await escribirCredenciales('EMP-009', 'prueba');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'El usuario EMP-009 está INACTIVO. Pide a un administrador que lo active.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Código de empleado')).toHaveFocus();
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
  });

  it('EMP-003 supervisor entra y va a /supervisor', async () => {
    const usuario = await escribirCredenciales('EMP-003', 'prueba');

    const tarjeta = await screen.findByRole('status');
    expect(tarjeta).toHaveTextContent('Hola, Juan David');
    expect(tarjeta).toHaveTextContent('Supervisor · EMP-003');

    await usuario.click(
      screen.getByRole('button', { name: 'Ir al panel del supervisor' }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Supervisión' }),
    ).toBeInTheDocument();
  });

  it('ADMIN-01 administrador entra y va a /admin', async () => {
    const usuario = await escribirCredenciales('ADMIN-01', 'prueba');

    const tarjeta = await screen.findByRole('status');
    expect(tarjeta).toHaveTextContent('Hola, Administración');
    expect(tarjeta).toHaveTextContent('Administrador · ADMIN-01');

    await usuario.click(
      screen.getByRole('button', { name: 'Ir a la administración' }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Administración' }),
    ).toBeInTheDocument();
  });

  it('un código inexistente muestra el mensaje del prototipo con foco en el campo', async () => {
    await escribirCredenciales('EMP-999', 'prueba');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'No existe un empleado con el código EMP-999.',
    );
    expect(screen.getByLabelText('Código de empleado')).toHaveFocus();
  });

  it('el código vacío muestra el mensaje del prototipo y enfoca el campo', async () => {
    renderConRutas(<FormularioLogin />);
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Contraseña'), 'prueba');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Escribe tu código de empleado.');
    expect(screen.getByLabelText('Código de empleado')).toHaveFocus();
  });

  it('la contraseña vacía muestra el mensaje del prototipo y enfoca el campo', async () => {
    renderConRutas(<FormularioLogin />);
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Código de empleado'), 'EMP-002');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Escribe tu contraseña.');
    expect(screen.getByLabelText('Contraseña')).toHaveFocus();
  });

  it('un error del servidor muestra el mensaje simulado y no entra', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'ERROR_SIMULADO',
              mensaje:
                'Error de servidor simulado mediante parámetro ?mock=error.',
            },
          },
          { status: 500 },
        ),
      ),
    );

    await escribirCredenciales('EMP-002', 'prueba');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'Error de servidor simulado mediante parámetro ?mock=error.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
  });

  it('el código se normaliza a mayúsculas antes de enviarse', async () => {
    await escribirCredenciales('emp-002', 'prueba');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Hola, María Fernanda',
    );
  });

  it('el código acepta máximo 8 caracteres', async () => {
    renderConRutas(<FormularioLogin />);
    const usuario = userEvent.setup();
    const codigo = screen.getByLabelText('Código de empleado');
    expect(codigo).toHaveAttribute('maxLength', '8');

    await usuario.type(codigo, 'EMP-002EXTRA');
    expect(codigo).toHaveValue('EMP-002E');
  });

  it('los campos tienen el autocomplete correcto', () => {
    renderConRutas(<FormularioLogin />);
    expect(screen.getByLabelText('Código de empleado')).toHaveAttribute(
      'autocomplete',
      'username',
    );
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  it('el error desaparece al volver a escribir', async () => {
    const usuario = await escribirCredenciales('EMP-001', 'prueba');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Código de empleado'), '2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el botón No soy yo, volver limpia la sesión y regresa al formulario', async () => {
    const usuario = await escribirCredenciales('EMP-003', 'prueba');
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(
      JSON.parse(window.sessionStorage.getItem('peajesys_sesion') ?? 'null'),
    ).toMatchObject({ codigo: 'EMP-003' });

    await usuario.click(
      screen.getByRole('button', { name: 'No soy yo, volver' }),
    );

    expect(
      screen.getByRole('button', { name: 'Ingresar' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Código de empleado')).toHaveValue('EMP-003');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
  });

  it('la tecla Enter envía el formulario', async () => {
    renderConRutas(<FormularioLogin />);
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Código de empleado'), 'EMP-003');
    const clave = screen.getByLabelText('Contraseña');
    await usuario.type(clave, 'prueba');
    await usuario.type(clave, '{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Hola, Juan David',
    );
  });
});
