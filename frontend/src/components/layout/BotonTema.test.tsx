import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemaProvider } from '@/lib/tema';
import { BotonTema } from './BotonTema';

describe('Componente BotonTema', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-tema');
    try {
      window.localStorage?.clear?.();
    } catch {
      // noop
    }
  });

  it('muestra el texto "Usar modo oscuro" cuando el tema actual es claro', () => {
    render(
      <TemaProvider temaPorDefecto="claro">
        <BotonTema />
      </TemaProvider>,
    );

    const boton = screen.getByRole('button', { name: /usar modo oscuro/i });
    expect(boton).toBeInTheDocument();
  });

  it('muestra el texto "Usar modo claro" cuando el tema actual es oscuro', () => {
    render(
      <TemaProvider temaPorDefecto="oscuro">
        <BotonTema />
      </TemaProvider>,
    );

    const boton = screen.getByRole('button', { name: /usar modo claro/i });
    expect(boton).toBeInTheDocument();
  });

  it('cambia el atributo data-tema del documento al hacer clic', async () => {
    const user = userEvent.setup();
    render(
      <TemaProvider temaPorDefecto="claro">
        <BotonTema />
      </TemaProvider>,
    );

    const boton = screen.getByRole('button', { name: /usar modo oscuro/i });
    await user.click(boton);

    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
    expect(
      screen.getByRole('button', { name: /usar modo claro/i }),
    ).toBeInTheDocument();
  });
});
