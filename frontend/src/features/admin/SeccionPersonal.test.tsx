import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { obtenerOperador } from '@/api/recursos/operadores';
import { renderConProveedores, screen, within } from '@/test/render';
import { SeccionPersonal } from './SeccionPersonal';

const admin = {
  id: 'ADMIN-01',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
  codigo: 'ADMIN-01',
};

function renderSeccion() {
  return renderConProveedores(<SeccionPersonal onAviso={() => {}} />, {
    usuarioInicial: admin,
  });
}

describe('Sección Personal (Admin.dc.html con datos del DML)', () => {
  it('lista los 10 operadores del DML con código, nombre, documento, rol y estado', async () => {
    renderSeccion();

    expect(await screen.findByRole('heading', { name: 'Personal' })).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('Carlos Alberto Gómez Pérez')).toBeInTheDocument();
    expect(screen.getByText('1047123456')).toBeInTheDocument();
    expect(screen.getByText('EMP-009')).toBeInTheDocument();
    expect(screen.getByText('Jorge Luis Vargas Romero')).toBeInTheDocument();
    expect(screen.getByText('SUPERVISOR')).toBeInTheDocument();
    expect(screen.getByText('EMP-003')).toBeInTheDocument();
    expect(screen.getByText('Un usuario INACTIVO no puede iniciar sesión ni abrir turno.')).toBeInTheDocument();
  });

  it('marca a EMP-009 como INACTIVO con acción para activarlo', async () => {
    renderSeccion();

    const fila = (await screen.findByText('EMP-009')).closest('tr');
    expect(fila).not.toBeNull();
    if (fila) {
      expect(within(fila).getByText('INACTIVO')).toBeInTheDocument();
      expect(
        within(fila).getByRole('button', { name: 'Activar a Jorge Luis Vargas Romero' }),
      ).toBeInTheDocument();
    }
  });

  it('filtra por apellido sin tildes', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await screen.findByText('EMP-001');
    await usuario.type(await screen.findByLabelText('Buscar por nombre o código'), 'diaz');

    expect(await screen.findByText('EMP-006')).toBeInTheDocument();
    expect(screen.getByText('Laura Patricia Díaz Morales')).toBeInTheDocument();
    expect(screen.queryByText('EMP-001')).not.toBeInTheDocument();
  });

  it('filtra por código aunque se escriba en minúsculas', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await screen.findByText('EMP-001');
    await usuario.type(await screen.findByLabelText('Buscar por nombre o código'), 'emp-009');

    expect(await screen.findByText('Jorge Luis Vargas Romero')).toBeInTheDocument();
    expect(screen.queryByText('EMP-001')).not.toBeInTheDocument();
  });

  it('avisa cuando nadie coincide con la búsqueda', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await screen.findByText('EMP-001');
    await usuario.type(await screen.findByLabelText('Buscar por nombre o código'), 'zzz');

    expect(
      await screen.findByText('Nadie coincide con la búsqueda'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Revisa el código (EMP-000) o escribe parte del nombre.'),
    ).toBeInTheDocument();
  });

  it('desactiva a un operador activo: aviso, badge y PATCH en el servidor', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', { name: 'Desactivar a Carlos Alberto Gómez Pérez' }),
    );

    expect(
      await screen.findByText('Carlos Alberto Gómez Pérez ahora está INACTIVO.'),
    ).toBeInTheDocument();

    await screen.findByText('Jorge Luis Vargas Romero');
    const fila = screen.getByText('EMP-001').closest('tr');
    expect(fila).not.toBeNull();
    if (fila) {
      expect(within(fila).getByText('INACTIVO')).toBeInTheDocument();
    }
    const operador = await obtenerOperador(1);
    expect(operador.estado).toBe('INACTIVO');
  });

  it('activa a EMP-009 que estaba INACTIVO en la semilla', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', { name: 'Activar a Jorge Luis Vargas Romero' }),
    );

    expect(
      await screen.findByText('Jorge Luis Vargas Romero ahora está ACTIVO.'),
    ).toBeInTheDocument();

    const fila = screen.getByText('EMP-009').closest('tr');
    expect(fila).not.toBeNull();
    if (fila) {
      expect(within(fila).getByText('ACTIVO')).toBeInTheDocument();
    }
    const operador = await obtenerOperador(9);
    expect(operador.estado).toBe('ACTIVO');
  });

  it('marca ADMIN-01 como usuario solo del front', async () => {
    renderSeccion();

    expect(
      await screen.findByText(/ADMIN-01.*solo del front/),
    ).toBeInTheDocument();
  });

  it('muestra estado de error con Reintentar cuando el servidor falla', async () => {
    server.use(
      http.get('*/api/operadores', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'ERROR_SIMULADO',
              mensaje: 'Error de servidor simulado mediante parámetro ?mock=error.',
            },
          },
          { status: 500 },
        ),
      ),
    );
    renderSeccion();

    expect(
      await screen.findByText('No se pudieron cargar los datos'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay personal registrado', async () => {
    server.use(http.get('*/api/operadores', () => HttpResponse.json([])));
    renderSeccion();

    expect(
      await screen.findByText('No hay personal registrado'),
    ).toBeInTheDocument();
  });
});
