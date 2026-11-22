import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { obtenerOperadores } from '@/api/recursos/operadores';
import { renderConProveedores, screen, waitFor, within } from '@/test/render';
import { SeccionPersonal } from './SeccionPersonal';

const admin = {
  id: 'ADM-001',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
  codigo: 'ADM-001',
};

function renderSeccion() {
  return renderConProveedores(<SeccionPersonal onAviso={() => {}} />, {
    usuarioInicial: admin,
  });
}

async function abrirNuevo(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(await screen.findByRole('button', { name: 'Nuevo operador' }));
  return screen.findByRole('dialog', { name: 'Nuevo operador' });
}

async function llenarNuevo(
  usuario: ReturnType<typeof userEvent.setup>,
  extra: { clave?: string; confirmacion?: string; codigo?: string; documento?: string } = {},
) {
  await usuario.type(screen.getByLabelText('Documento'), extra.documento ?? '1099000111');
  await usuario.type(screen.getByLabelText('Nombres'), 'Ana María');
  await usuario.type(screen.getByLabelText('Apellidos'), 'Pérez Ruiz');
  await usuario.type(screen.getByLabelText('Código de empleado'), extra.codigo ?? 'REC-010');
  await usuario.type(screen.getByLabelText('Contraseña'), extra.clave ?? 'Clave-segura1');
  await usuario.type(
    screen.getByLabelText('Confirmar contraseña'),
    extra.confirmacion ?? extra.clave ?? 'Clave-segura1',
  );
}

describe('Personal: nuevo operador con contraseña', () => {
  it('abre el diálogo accesible con los campos etiquetados y el foco dentro', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    const dialogo = await abrirNuevo(usuario);

    for (const etiqueta of [
      'Documento',
      'Nombres',
      'Apellidos',
      'Código de empleado',
      'Rol',
      'Contraseña',
      'Confirmar contraseña',
    ]) {
      expect(within(dialogo).getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(dialogo.contains(document.activeElement)).toBe(true);
    const rol = within(dialogo).getByLabelText('Rol');
    expect(within(rol).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Recaudador',
      'Supervisor',
      'Administrador',
    ]);
  });

  it('la contraseña no se ve en claro y el botón la muestra', async () => {
    const usuario = userEvent.setup();
    renderSeccion();
    await abrirNuevo(usuario);

    const clave = screen.getByLabelText('Contraseña');
    expect(clave).toHaveAttribute('type', 'password');
    await usuario.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(clave).toHaveAttribute('type', 'text');
    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(clave).toHaveAttribute('type', 'password');
  });

  it('Esc cierra el diálogo y devuelve el foco al botón', async () => {
    const usuario = userEvent.setup();
    renderSeccion();
    const boton = await screen.findByRole('button', { name: 'Nuevo operador' });
    await usuario.click(boton);
    await screen.findByRole('dialog');

    await usuario.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(boton).toHaveFocus();
  });

  it('valida campos vacíos con role=alert y no envía', async () => {
    const usuario = userEvent.setup();
    const envio = vi.fn();
    server.use(http.post('*/api/operadores', () => { envio(); return HttpResponse.json({}, { status: 500 }); }));
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);

    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));

    expect(await within(dialogo).findByText('Escribe el número de documento.')).toBeInTheDocument();
    expect(within(dialogo).getAllByRole('alert').length).toBeGreaterThanOrEqual(4);
    expect(envio).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas distintas y contraseñas cortas', async () => {
    const usuario = userEvent.setup();
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);
    await llenarNuevo(usuario, { clave: 'corta1', confirmacion: 'corta1' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));
    expect(
      await within(dialogo).findByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText('Contraseña'));
    await usuario.clear(screen.getByLabelText('Confirmar contraseña'));
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave-segura1');
    await usuario.type(screen.getByLabelText('Confirmar contraseña'), 'Clave-segura2');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));
    expect(await within(dialogo).findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('envía el cuerpo correcto (ADMINISTRADOR, password, sin confirmación) y lista al nuevo', async () => {
    const usuario = userEvent.setup();
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post('*/api/operadores', async ({ request }) => {
        cuerpo = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);
    await llenarNuevo(usuario);
    await usuario.selectOptions(within(dialogo).getByLabelText('Rol'), 'Administrador');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));

    expect(await screen.findByText('REC-010')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cuerpo).toEqual({
      numero_documento: '1099000111',
      nombres: 'Ana María',
      apellidos: 'Pérez Ruiz',
      codigo_empleado: 'REC-010',
      rol: 'ADMINISTRADOR',
      password: 'Clave-segura1',
    });
    const lista = await obtenerOperadores();
    expect(lista.find((o) => o.codigo_empleado === 'REC-010')?.rol).toBe('ADMINISTRADOR');
  });

  it('muestra el 409 OPERADOR_DUPLICADO con su mensaje dentro del diálogo', async () => {
    const usuario = userEvent.setup();
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);
    await llenarNuevo(usuario, { codigo: 'EMP-001', documento: '777000111' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));

    const alerta = await within(dialogo).findByRole('alert');
    expect(alerta).toHaveTextContent(/Ya existe un operador/);
    expect(screen.getByRole('dialog', { name: 'Nuevo operador' })).toBeInTheDocument();
  });

  it('muestra el mensaje del 422 de la API dentro del diálogo', async () => {
    server.use(
      http.post('*/api/operadores', () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_VALIDACION', mensaje: 'La contrasena es requerida para crear un operador.' } },
          { status: 422 },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);
    await llenarNuevo(usuario);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));

    expect(await within(dialogo).findByText('La contrasena es requerida para crear un operador.')).toBeInTheDocument();
  });

  it('la contraseña no sale en consola ni queda en el DOM tras cerrar', async () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const usuario = userEvent.setup();
    renderSeccion();
    const dialogo = await abrirNuevo(usuario);
    await llenarNuevo(usuario, { clave: 'Secreta-9876' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear operador' }));
    await screen.findByText('REC-010');

    for (const e of espias) {
      expect(JSON.stringify(e.mock.calls)).not.toContain('Secreta-9876');
      e.mockRestore();
    }
    expect(document.body.innerHTML).not.toContain('Secreta-9876');
  });
});

describe('Personal: editar y cambiar contraseña', () => {
  it('Editar cambia nombres, apellidos y rol con PATCH parcial', async () => {
    const usuario = userEvent.setup();
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.patch('*/api/operadores/:id', async ({ request }) => {
        cuerpo = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', { name: 'Editar a Carlos Alberto Gómez Pérez' }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Editar operador' });
    expect(within(dialogo).getByLabelText('Nombres')).toHaveValue('Carlos Alberto');
    expect(within(dialogo).queryByLabelText('Contraseña')).not.toBeInTheDocument();
    await usuario.clear(within(dialogo).getByLabelText('Nombres'));
    await usuario.type(within(dialogo).getByLabelText('Nombres'), 'Carlos A.');
    await usuario.selectOptions(within(dialogo).getByLabelText('Rol'), 'Supervisor');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Carlos A. Gómez Pérez')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cuerpo).toEqual({ nombres: 'Carlos A.', apellidos: 'Gómez Pérez', rol: 'SUPERVISOR' });
  });

  it('Cambiar contraseña pide dos veces la clave y envía solo password', async () => {
    const usuario = userEvent.setup();
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.patch('*/api/operadores/:id', async ({ request }) => {
        cuerpo = (await request.clone().json()) as Record<string, unknown>;
        return undefined;
      }),
    );
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', { name: 'Cambiar contraseña de Carlos Alberto Gómez Pérez' }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar contraseña' });
    await usuario.type(within(dialogo).getByLabelText('Nueva contraseña'), 'Nueva-clave-1');
    await usuario.type(within(dialogo).getByLabelText('Confirmar contraseña'), 'Nueva-clave-2');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar contraseña' }));
    expect(await within(dialogo).findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(cuerpo).toEqual({});

    await usuario.clear(within(dialogo).getByLabelText('Confirmar contraseña'));
    await usuario.type(within(dialogo).getByLabelText('Confirmar contraseña'), 'Nueva-clave-1');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cuerpo).toEqual({ password: 'Nueva-clave-1' });
    expect(await screen.findByRole('status')).toHaveTextContent(/contraseña/i);
  });

  it('muestra el error de la API al cambiar contraseña dentro del diálogo', async () => {
    server.use(
      http.patch('*/api/operadores/:id', () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_VALIDACION', mensaje: 'La contrasena no puede estar vacia.' } },
          { status: 422 },
        ),
      ),
    );
    const usuario = userEvent.setup();
    renderSeccion();
    await usuario.click(
      await screen.findByRole('button', { name: 'Cambiar contraseña de Carlos Alberto Gómez Pérez' }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar contraseña' });
    await usuario.type(within(dialogo).getByLabelText('Nueva contraseña'), 'Nueva-clave-1');
    await usuario.type(within(dialogo).getByLabelText('Confirmar contraseña'), 'Nueva-clave-1');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar contraseña' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('La contrasena no puede estar vacia.');
  });
});
