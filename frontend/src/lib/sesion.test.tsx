import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SesionProvider, useSesion, RequireRol } from './sesion';
import { Usuario } from './roles';

const usuarioOperador: Usuario = {
  id: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR',
};

const usuarioSupervisor: Usuario = {
  id: 'EMP-003',
  nombre: 'Juan David Rodríguez Silva',
  rol: 'SUPERVISOR',
};

const usuarioAdmin: Usuario = {
  id: 'ADM-001',
  nombre: 'Administración',
  rol: 'ADMIN',
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

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent('Sin sesión');
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('Sin rol');
  });

  it('permite iniciar y cerrar sesión persistiendo en sessionStorage', async () => {
    const user = userEvent.setup();

    render(
      <SesionProvider>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    const btnLogin = screen.getByTestId('btn-login');
    await user.click(btnLogin);

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'María Fernanda López Martínez',
    );
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('RECAUDADOR');

    const guardado = JSON.parse(
      window.sessionStorage.getItem('peajesys_sesion') || '{}',
    );
    expect(guardado.id).toBe('EMP-002');
    expect(guardado.rol).toBe('RECAUDADOR');

    const btnLogout = screen.getByTestId('btn-logout');
    await user.click(btnLogout);

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent('Sin sesión');
    expect(
      window.sessionStorage.getItem('peajesys_sesion'),
    ).toBeNull();
  });

  it('carga la sesión inicial si se pasa en props', () => {
    render(
      <SesionProvider usuarioInicial={usuarioSupervisor}>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent(
      'Juan David Rodríguez Silva',
    );
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('SUPERVISOR');
  });

  it('restaura sesión automáticamente desde sessionStorage al montar sin props', () => {
    window.sessionStorage.setItem(
      'peajesys_sesion',
      JSON.stringify(usuarioAdmin),
    );

    render(
      <SesionProvider>
        <ComponentePruebaSesion />
      </SesionProvider>,
    );

    expect(screen.getByTestId('usuario-nombre')).toHaveTextContent('Administración');
    expect(screen.getByTestId('usuario-rol')).toHaveTextContent('ADMIN');
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

    it('permite el acceso si el rol coincide vía props', () => {
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

    it('permite el acceso si el rol coincide hidratado desde sessionStorage', () => {
      window.sessionStorage.setItem(
        'peajesys_sesion',
        JSON.stringify(usuarioOperador),
      );

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
