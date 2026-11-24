import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { server } from '@/mocks/server';
import { getDb } from '@/mocks/db';
import { renderConProveedores, screen, waitFor, within } from '@/test/render';
import { PanelTransaccionesTurno } from './PanelTransaccionesTurno';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuario = {
  id: '2',
  codigo: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR' as const,
};

function renderizar(puedeAnular = true) {
  return renderConProveedores(
    <PanelTransaccionesTurno idTurno={9} puedeAnular={puedeAnular} />,
    { usuarioInicial: usuario },
  );
}

function registrarEnEfectivo(placa: string) {
  return getDb().registrarTransaccion({
    id_turno: 9,
    id_tarifa: 1,
    id_categoria: 1,
    placa_detectada: placa,
    monto_tarifa: 10500,
    metodo_pago: 'EFECTIVO',
    estado_paso: 'APROBADO',
    usuario_sistema: 'EMP-002',
  }).transaccion;
}

describe('PanelTransaccionesTurno', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista las transacciones del turno con placa, categoría, método, monto y ticket, y botón Anular', async () => {
    renderizar();

    expect(
      await screen.findByRole('heading', { name: 'Transacciones del turno' }),
    ).toBeInTheDocument();
    const fila = await screen.findByTestId('fila-transaccion-11');
    expect(within(fila).getByText('GHJ357')).toBeInTheDocument();
    expect(within(fila).getByText(/TCK-20261006-00011/)).toBeInTheDocument();
    expect(within(fila).getByText(/EFECTIVO/)).toBeInTheDocument();
    expect(within(fila).getByText('$ 10.500')).toBeInTheDocument();
    expect(
      within(fila).getByRole('button', { name: /Anular/ }),
    ).toBeInTheDocument();
  });

  it('marca las anuladas y les quita el botón', async () => {
    const otra = registrarEnEfectivo('ZZZ999');
    getDb().anularTransaccion(otra.id_transaccion, 'EMP-002', 'Duplicado');
    renderizar();

    const anulada = await screen.findByTestId(
      `fila-transaccion-${otra.id_transaccion}`,
    );
    expect(within(anulada).getByText('Anulada')).toBeInTheDocument();
    expect(within(anulada).queryByRole('button')).toBeNull();
    const viva = screen.getByTestId('fila-transaccion-11');
    expect(within(viva).queryByText('Anulada')).toBeNull();
    expect(
      within(viva).getByRole('button', { name: /Anular/ }),
    ).toBeInTheDocument();
  });

  it('sin puedeAnular (turno cerrado) no muestra ningún botón Anular', async () => {
    renderizar(false);

    await screen.findByTestId('fila-transaccion-11');
    expect(screen.queryByRole('button', { name: /Anular/ })).toBeNull();
  });

  it('el diálogo muestra el resumen, exige el motivo y cuenta hasta 255', async () => {
    const user = userEvent.setup();
    renderizar();
    const boton = within(
      await screen.findByTestId('fila-transaccion-11'),
    ).getByRole('button', { name: /Anular/ });

    await user.click(boton);

    const dialogo = await screen.findByRole('dialog', {
      name: /Anular transacción/i,
    });
    expect(within(dialogo).getByText(/GHJ357/)).toBeInTheDocument();
    expect(within(dialogo).getByText('0/255')).toBeInTheDocument();
    const campo = within(dialogo).getByLabelText('Motivo');
    expect(campo).toHaveFocus();

    await user.click(
      within(dialogo).getByRole('button', { name: 'Anular transacción' }),
    );
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      /motivo/i,
    );

    await user.type(campo, 'Cobro duplicado');
    expect(within(dialogo).getByText('15/255')).toBeInTheDocument();
    expect(campo).toHaveAttribute('maxlength', '255');
  });

  it('Esc cierra el diálogo y el foco vuelve al botón Anular', async () => {
    const user = userEvent.setup();
    renderizar();
    const boton = within(
      await screen.findByTestId('fila-transaccion-11'),
    ).getByRole('button', { name: /Anular/ });
    await user.click(boton);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(boton).toHaveFocus();
  });

  it('un envío correcto muestra el aviso, marca la fila como Anulada y cierra el diálogo', async () => {
    const user = userEvent.setup();
    renderizar();
    const fila = await screen.findByTestId('fila-transaccion-11');
    await user.click(within(fila).getByRole('button', { name: /Anular/ }));
    const dialogo = await screen.findByRole('dialog');

    await user.type(
      within(dialogo).getByLabelText('Motivo'),
      'Cobro duplicado',
    );
    await user.click(
      within(dialogo).getByRole('button', { name: 'Anular transacción' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/anulada/i),
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId('fila-transaccion-11')).getByText('Anulada'),
      ).toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId('fila-transaccion-11')).queryByRole('button'),
    ).toBeNull();
  });

  it('un 409 de la API se muestra en el diálogo, que sigue abierto', async () => {
    server.use(
      http.post('/api/transacciones/:id/anulacion', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'TRANSACCION_YA_ANULADA',
              mensaje: 'La transacción 11 ya fue anulada.',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderizar();
    await user.click(
      within(await screen.findByTestId('fila-transaccion-11')).getByRole(
        'button',
        { name: /Anular/ },
      ),
    );
    const dialogo = await screen.findByRole('dialog');

    await user.type(within(dialogo).getByLabelText('Motivo'), 'Otra vez');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Anular transacción' }),
    );

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'La transacción 11 ya fue anulada.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
