import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import { AbrirTurnoPage } from './AbrirTurnoPage';
import { reiniciarDb } from '@/mocks/db';

describe('Pantalla Abrir Turno (AbrirTurnoPage)', () => {
  const usuarioRecaudador = {
    id: '14',
    codigo: 'REC-002',
    nombre: 'Camilo Guzmán',
    rol: 'RECAUDADOR' as const,
  };

  beforeEach(() => {
    reiniciarDb();
  });

  it('renderiza el formulario con título, selector de caseta, fondo inicial y horario', async () => {
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    expect(await screen.findByRole('heading', { name: /Abrir turno/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Caseta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fondo inicial de caja/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir turno/i })).toBeInTheDocument();
  });

  it('muestra errores de validación si no se selecciona caseta o fondo negativo', async () => {
    const user = userEvent.setup();
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const boton = await screen.findByRole('button', { name: /Abrir turno/i });
    await user.click(boton);

    // Debe mostrar error de validación
    expect(await screen.findByText(/Selecciona una caseta/i)).toBeInTheDocument();
  });

  it('muestra error 409 CASETA_OCUPADA visible cuando la caseta ya tiene turno abierto', async () => {
    server.use(
      http.post('/api/turnos/abrir', () => {
        return HttpResponse.json(
          {
            error: {
              codigo: 'CASETA_OCUPADA',
              mensaje: 'La caseta ya tiene un turno ABIERTO.',
            },
          },
          { status: 409 },
        );
      }),
    );

    const user = userEvent.setup();
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const selectCaseta = await screen.findByLabelText(/Caseta/i);
    await user.selectOptions(selectCaseta, '2');

    const boton = screen.getByRole('button', { name: /Abrir turno/i });
    await user.click(boton);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('La caseta ya tiene un turno ABIERTO.');
  });
});
