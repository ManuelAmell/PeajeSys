import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderConProveedores, screen, waitFor, within } from '@/test/render';
import OperadorPage from './routes';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuario = {
  id: '2',
  codigo: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR' as const,
};

describe('Terminal del operador: panel Transacciones del turno', () => {
  it('el panel está plegado, se abre y anular actualiza la fila y el recaudo del turno', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuario,
    });
    await screen.findByRole('heading', { name: /Terminal de cobro/i });
    expect(
      screen.getByText('Recaudado en efectivo').nextElementSibling,
    ).toHaveTextContent('$ 10.500');
    expect(screen.queryByTestId('fila-transaccion-11')).toBeNull();

    await user.click(
      screen.getByRole('button', { name: /Transacciones del turno/i }),
    );
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
    await waitFor(() =>
      expect(
        within(screen.getByTestId('fila-transaccion-11')).getByText('Anulada'),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByText('Recaudado en efectivo').nextElementSibling,
      ).toHaveTextContent('$ 0'),
    );
  });
});
