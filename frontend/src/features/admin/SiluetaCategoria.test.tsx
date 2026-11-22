import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SiluetaCategoria } from './SiluetaCategoria';

describe('SiluetaCategoria', () => {
  it('muestra la imagen procesada de una categoría conocida', () => {
    const { container } = render(
      <SiluetaCategoria idCategoria={3} ancho={72} alto={28} />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/img/cat-3.png');
    expect(screen.queryByTestId('silueta-por-defecto')).toBeNull();
  });

  it('usa un marcador, sin <img> roto, para una categoría sin imagen', () => {
    const { container } = render(
      <SiluetaCategoria idCategoria={8} ancho={72} alto={28} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('silueta-por-defecto')).toBeInTheDocument();
  });

  it('cambia al marcador si la imagen falla al cargar', () => {
    const { container } = render(
      <SiluetaCategoria idCategoria={2} ancho={72} alto={28} />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    if (img) fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('silueta-por-defecto')).toBeInTheDocument();
  });
});
