import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderConProveedores, screen, within } from '@/test/render';
import SupervisorPage from './routes';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const supervisor = {
  id: 'EMP-003',
  nombre: 'Juan David Rodríguez Silva',
  rol: 'SUPERVISOR' as const,
};

describe('Supervisor: transacciones de un turno en el arqueo', () => {
  it('solo los turnos abiertos tienen el botón y abre el mismo panel con botones Anular', async () => {
    const user = userEvent.setup();
    renderConProveedores(<SupervisorPage />, { initialEntries: ['/supervisor'], usuarioInicial: supervisor });

    const filaAbierta = await screen.findByTestId('fila-turno-9');
    const filaCerrada = await screen.findByTestId('fila-turno-8');
    expect(within(filaCerrada).queryByRole('button', { name: /Transacciones/i })).toBeNull();

    await user.click(within(filaAbierta).getByRole('button', { name: /Transacciones/i }));

    expect(await screen.findByRole('heading', { name: 'Transacciones del turno 9' })).toBeInTheDocument();
    const fila = await screen.findByTestId('fila-transaccion-11');
    expect(within(fila).getByRole('button', { name: /Anular/ })).toBeInTheDocument();
  });
});
