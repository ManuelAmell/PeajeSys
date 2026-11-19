import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';

describe('Componente Dialog (Radix UI)', () => {
  it('se abre al activar el trigger y se cierra al presionar Escape', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Abrir modal</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Título del modal</DialogTitle>
          <DialogDescription>Descripción del modal de prueba</DialogDescription>
          <button type="button">Acción dentro del modal</button>
        </DialogContent>
      </Dialog>,
    );

    // Inicialmente no está en el documento
    expect(screen.queryByText('Título del modal')).not.toBeInTheDocument();

    // Abrir modal
    await user.click(screen.getByRole('button', { name: /abrir modal/i }));
    expect(await screen.findByText('Título del modal')).toBeInTheDocument();

    // Presionar Escape
    await user.keyboard('{Escape}');

    // Debe cerrarse
    await waitFor(() => {
      expect(screen.queryByText('Título del modal')).not.toBeInTheDocument();
    });
  });

  it('mantiene el foco dentro del contenido del diálogo mientras está abierto', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button type="button">Botón exterior previo</button>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir diálogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Diálogo con foco</DialogTitle>
            <DialogDescription>Contenido</DialogDescription>
            <input placeholder="Primer campo" />
            <button type="button">Segundo botón</button>
          </DialogContent>
        </Dialog>
        <button type="button">Botón exterior posterior</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /abrir diálogo/i }));
    expect(await screen.findByText('Diálogo con foco')).toBeInTheDocument();

    // El foco debe estar dentro del diálogo
    const primerCampo = screen.getByPlaceholderText('Primer campo');
    const segundoBoton = screen.getByRole('button', { name: /segundo botón/i });
    const botonCerrar = screen.getByRole('button', { name: /cerrar diálogo/i });

    // Tabular navega entre los elementos del diálogo
    await user.tab();
    expect([primerCampo, segundoBoton, botonCerrar]).toContain(
      document.activeElement,
    );

    await user.tab();
    expect([primerCampo, segundoBoton, botonCerrar]).toContain(
      document.activeElement,
    );
  });
});
