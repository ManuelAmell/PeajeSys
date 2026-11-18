import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SesionProvider, useSesion, RequireRol } from './sesion';
import { Usuario } from './roles';

const usuarioOperador: Usuario = {
  id: 'EMP-001',
  nombre: 'María López',
  rol: 'RECAUDADOR',
};

const usuarioSupervisor: Usuario = {
  id: 'SUP-001',
  nombre: 'Juan Rodríguez',
  rol: 'SUPERVISOR',
};

function ComponentePruebaSesion() {
  const { usuario, iniciarSesion, cerrarSesion } = useSesion();

  return (
    <div>
      <span data-testid="usuario-nombre">
        {usuario ? usuario.nombre : 'Sin sesión'}
      </span>
      <span data-testid="usuario-rol">{usuario ? usuario.rol : 'Sin rol'}</span>
      <button
        onClick={() => iniciarSesion(usuarioOperador)}
        data-testid="btn-login"
      >
        Iniciar
      </button>
      <button onClick={() => cerrarSesion()} data-testid="btn-logout">
        Cerrar
      </button>
    </div>
  );
}

describe('Sesión y autenticación (sesion.tsx)', () => {
  beforeEach(() => {
    try {
      window.sessionStorage?.clear?.();
    } catch {
      // noop
    }
  });

  it('inicia sin usuario por defecto', () => {
    render(
      <SesionProvider>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'Sin sesión',
    );
  });

  it('permite iniciar y cerrar sesión persistiendo en sessionStorage', async () => {
    const user = userEvent.setup();
    render(
      <SesionProvider>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    await user.click(screen.getByTestId('btn-login'));
    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'María López',
    );
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('RECAUDADOR');

    await user.click(screen.getByTestId('btn-logout'));
    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'Sin sesión',
    );
  });

  it('carga la sesión inicial si se pasa en props', () => {
    render(
      <SesionProvider usuarioInicial={usuarioSupervisor}>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'Juan Rodríguez',
    );
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('SUPERVISOR');
  });

  describe('RequireRol (Guardia de rutas)', () => {
    it('redirige a /login si no hay usuario autenticado', () => {
      render(
        <MemoryRouter initialEntries={['/operador']}>
          <SesionProvider>
            <Routes>
              <Route path="/login" element={<div>Página de Login</div>} />
              <Route
                path="/operador"
                element={
                  <RequireRol rolPermitido="RECAUDADOR">
                    <div>Página de Operador</div>
                  </RequireRol>
                }
              />
            </Routes>
          </SesionProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText('Página de Login')).toBeInTheDocument();
      expect(screen.queryByText('Página de Operador')).not.toBeInTheDocument();
    });

    it('permite el acceso si el rol coincide', () => {
      render(
        <MemoryRouter initialEntries={['/operador']}>
          <SesionProvider usuarioInicial={usuarioOperador}>
            <Routes>
              <Route path="/login" element={<div>Página de Login</div>} />
              <Route
                path="/operador"
                element={
                  <RequireRol rolPermitido="RECAUDADOR">
                    <div>Página de Operador</div>
                  </RequireRol>
                }
              />
            </Routes>
          </SesionProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText('Página de Operador')).toBeInTheDocument();
    });

    it('redirige a la ruta propia del rol si el usuario tiene un rol diferente', () => {
      render(
        <MemoryRouter initialEntries={['/operador']}>
          <SesionProvider usuarioInicial={usuarioSupervisor}>
            <Routes>
              <Route path="/login" element={<div>Página de Login</div>} />
              <Route
                path="/operador"
                element={
                  <RequireRol rolPermitido="RECAUDADOR">
                    <div>Página de Operador</div>
                  </RequireRol>
                }
              />
              <Route
                path="/supervisor"
                element={<div>Página de Supervisor</div>}
              />
            </Routes>
          </SesionProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText('Página de Supervisor')).toBeInTheDocument();
      expect(screen.queryByText('Página de Operador')).not.toBeInTheDocument();
    });
  });
});
