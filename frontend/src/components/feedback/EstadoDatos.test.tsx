import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EstadoVacio,
  EstadoCargando,
  EstadoError,
  EstadoDatos,
} from './EstadoDatos';

describe('Componentes de estados de datos (EstadoDatos.tsx)', () => {
  it('EstadoVacio muestra título, mensaje y tiene role="status"', () => {
    render(
      <EstadoVacio
        titulo="No hay registros"
        mensaje="Los registros aparecerán aquí."
      />,
    );

    const estado = screen.getByRole('status');
    expect(estado).toBeInTheDocument();
    expect(screen.getByText('No hay registros')).toBeInTheDocument();
    expect(
      screen.getByText('Los registros aparecerán aquí.'),
    ).toBeInTheDocument();
  });

  it('EstadoCargando muestra mensaje y tiene role="status"', () => {
    render(<EstadoCargando mensaje="Cargando tarifas…" />);

    const estado = screen.getByRole('status');
    expect(estado).toBeInTheDocument();
    expect(screen.getByText('Cargando tarifas…')).toBeInTheDocument();
  });

  it('EstadoError muestra error, tiene role="alert" y ejecuta onRetry al pulsar el botón', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <EstadoError
        titulo="Fallo de red"
        mensaje="No se pudo conectar al servidor."
        onReintentar={handleRetry}
      />,
    );

    const alerta = screen.getByRole('alert');
    expect(alerta).toBeInTheDocument();
    expect(screen.getByText('Fallo de red')).toBeInTheDocument();

    const boton = screen.getByRole('button', { name: /reintentar/i });
    await user.click(boton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  describe('Envoltorio EstadoDatos', () => {
    it('muestra EstadoCargando si isPending es true', () => {
      render(
        <EstadoDatos isPending={true}>
          <div>Contenido cargado</div>
        </EstadoDatos>,
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Contenido cargado')).not.toBeInTheDocument();
    });

    it('muestra EstadoError si isError es true', () => {
      render(
        <EstadoDatos isError={true} error={new Error('Error de conexión')}>
          <div>Contenido cargado</div>
        </EstadoDatos>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Contenido cargado')).not.toBeInTheDocument();
    });

    it('muestra EstadoVacio si los datos son un arreglo vacío', () => {
      render(
        <EstadoDatos data={[]} isPending={false} isError={false}>
          <div>Contenido cargado</div>
        </EstadoDatos>,
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Contenido cargado')).not.toBeInTheDocument();
    });

    it('muestra el contenido cuando los datos están presentes y no hay carga ni error', () => {
      render(
        <EstadoDatos data={[{ id: 1 }]} isPending={false} isError={false}>
          <div>Contenido exitoso</div>
        </EstadoDatos>,
      );

      expect(screen.getByText('Contenido exitoso')).toBeInTheDocument();
    });
  });
});
