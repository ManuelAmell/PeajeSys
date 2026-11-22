import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResumenCaja } from './ResumenCaja';
import type { PasoRegistrado } from '../types';

const paso = (id: number, anulada: boolean): PasoRegistrado => ({
  id_transaccion: id,
  ticket: `T-${id}`,
  hora: '10:00',
  placa: `ABC12${id}`,
  categoriaRomano: 'I',
  metodoPago: 'EFECTIVO',
  monto: 10500,
  montoTexto: '$ 10.500',
  anulada,
});

describe('ResumenCaja: Últimos pasos con una anulada', () => {
  it('marca la anulada (etiqueta y tachado) y no la cuenta en Pasos registrados', () => {
    render(
      <ResumenCaja
        fondoInicial={100000}
        totalRecaudadoEfectivo={10500}
        pasos={[paso(2, true), paso(1, false)]}
      />,
    );

    expect(
      screen.getByText('Pasos registrados').nextElementSibling,
    ).toHaveTextContent('1');

    const filas = screen.getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    const anulada = filas[0]!;
    expect(within(anulada).getByText('Anulada')).toBeInTheDocument();
    expect(within(anulada).getByText('ABC122')).toHaveClass('line-through');
    expect(within(filas[1]!).queryByText('Anulada')).toBeNull();
    expect(within(filas[1]!).getByText('ABC121')).not.toHaveClass(
      'line-through',
    );
  });
});
