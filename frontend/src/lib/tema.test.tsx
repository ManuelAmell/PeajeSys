import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemaProvider, useTema } from './tema';

function ComponentePruebaTema() {
  const { tema, alternarTema, fijarTema } = useTema();

  return (
    <div>
      <span data-testid="tema-actual">{tema}</span>
      <button onClick={alternarTema} data-testid="btn-alternar">
        Alternar
      </button>
      <button
        onClick={() => fijarTema('oscuro')}
        data-testid="btn-fijar-oscuro"
      >
        Fijar Oscuro
      </button>
    </div>
  );
}

describe('Manejo del tema (tema.tsx)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-tema');
    try {
      window.localStorage?.clear?.();
    } catch {
      // noop
    }
  });

  it('usa claro por defecto cuando no hay preferencia ni almacenamiento', () => {
    render(
      <TemaProvider>
        <ComponentePruebaTema />
      </TemaProvider>,
    );

    expect(screen.getByTestId('tema-actual')).toHaveTextContent('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });

  it('permite alternar tema y actualiza el atributo data-tema del html', async () => {
    const user = userEvent.setup();
    render(
      <TemaProvider>
        <ComponentePruebaTema />
      </TemaProvider>,
    );

    await user.click(screen.getByTestId('btn-alternar'));
    expect(screen.getByTestId('tema-actual')).toHaveTextContent('oscuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');

    await user.click(screen.getByTestId('btn-alternar'));
    expect(screen.getByTestId('tema-actual')).toHaveTextContent('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });

  it('respeta el tema guardado en localStorage si existe', () => {
    window.localStorage?.setItem?.('peajesys_tema', 'oscuro');

    render(
      <TemaProvider>
        <ComponentePruebaTema />
      </TemaProvider>,
    );

    expect(screen.getByTestId('tema-actual')).toHaveTextContent('oscuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
  });

  it('sigue prefers-color-scheme cuando no hay valor en localStorage', () => {
    // Simular que el sistema prefiere modo oscuro
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <TemaProvider>
        <ComponentePruebaTema />
      </TemaProvider>,
    );

    expect(screen.getByTestId('tema-actual')).toHaveTextContent('oscuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
  });
});
