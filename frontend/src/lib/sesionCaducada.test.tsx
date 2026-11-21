import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { server } from '@/mocks/server';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import { RequireRol, useSesion } from '@/lib/sesion';
import { clienteHttp } from '@/api/clienteHttp';
import { guardarToken, obtenerToken, borrarToken } from '@/api/sesionToken';
import { useLogin } from '@/api/recursos/auth';
import type { Usuario } from '@/lib/roles';

const admin: Usuario = {
  id: 'ADM-001',
  nombre: 'Manuel Amell',
  rol: 'ADMIN',
  codigo: 'ADM-001',
};

function ComponenteProtegido() {
  const { data } = useQuery({
    queryKey: ['consulta-protegida'],
    queryFn: () => clienteHttp('/consulta-protegida'),
    retry: false,
  });
  return <div>datos-protegidos: {JSON.stringify(data)}</div>;
}

function ComponenteLoginPrueba() {
  const loginMutation = useLogin();
  return (
    <div>
      <button
        onClick={() =>
          loginMutation.mutate({ codigo: 'INVALIDO', clave: 'Clave123*' })
        }
      >
        probar-login
      </button>
      {loginMutation.isError && <div>error-login</div>}
    </div>
  );
}

function ComponenteCon403() {
  const { data } = useQuery({
    queryKey: ['consulta-403'],
    queryFn: () => clienteHttp('/recurso-prohibido'),
    retry: false,
  });
  return <div>datos-403: {JSON.stringify(data)}</div>;
}

describe('F15: Manejo de sesión caducada ante error 401', () => {
  beforeEach(() => {
    borrarToken();
    window.sessionStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(toast, 'error').mockImplementation(() => '' as any);
  });

  it('un 401 en una consulta protegida con sesión activa cierra la sesión y navega a /login', async () => {
    server.use(
      http.get('*/api/consulta-protegida', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'NO_AUTENTICADO',
              mensaje: 'Token JWT expirado o inválido.',
            },
          },
          { status: 401 },
        ),
      ),
    );

    guardarToken('jwt-caducado');

    renderConProveedores(
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRol rolPermitido="ADMIN">
              <ComponenteProtegido />
            </RequireRol>
          }
        />
        <Route path="/login" element={<div>pantalla-login</div>} />
      </Routes>,
      {
        usuarioInicial: admin,
        initialEntries: ['/admin'],
      },
    );

    // Debe navegar a /login
    expect(await screen.findByText('pantalla-login')).toBeInTheDocument();

    // Debe haber cerrado la sesión (limpiando sessionStorage y token)
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
    expect(obtenerToken()).toBeNull();

    // Debe mostrar el aviso visible
    expect(toast.error).toHaveBeenCalledWith(
      'Tu sesión expiró, vuelve a iniciar sesión',
    );
  });

  it('el 401 del login no cierra nada ni muestra aviso de sesión expirada', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'CREDENCIALES_INVALIDAS',
              mensaje: 'Código de empleado o contraseña incorrectos.',
            },
          },
          { status: 401 },
        ),
      ),
    );

    renderConProveedores(<ComponenteLoginPrueba />, {
      initialEntries: ['/login'],
    });

    const boton = screen.getByRole('button', { name: 'probar-login' });
    boton.click();

    expect(await screen.findByText('error-login')).toBeInTheDocument();

    // No debe mostrar el aviso de sesión expirada
    expect(toast.error).not.toHaveBeenCalledWith(
      'Tu sesión expiró, vuelve a iniciar sesión',
    );
  });

  it('un 403 no cierra la sesión', async () => {
    server.use(
      http.get('*/api/recurso-prohibido', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'SIN_PERMISO',
              mensaje: 'No tiene permisos suficientes.',
            },
          },
          { status: 403 },
        ),
      ),
    );

    guardarToken('jwt-valido');

    renderConProveedores(
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRol rolPermitido="ADMIN">
              <ComponenteCon403 />
            </RequireRol>
          }
        />
        <Route path="/login" element={<div>pantalla-login</div>} />
      </Routes>,
      {
        usuarioInicial: admin,
        initialEntries: ['/admin'],
      },
    );

    // Esperar a que la consulta intente cargar
    await waitFor(() => {
      expect(screen.getByText(/datos-403/)).toBeInTheDocument();
    });

    // La sesión sigue activa
    expect(window.sessionStorage.getItem('peajesys_sesion')).not.toBeNull();
    expect(obtenerToken()).toBe('jwt-valido');

    // No debe navegar a /login ni mostrar aviso de sesión expirada
    expect(screen.queryByText('pantalla-login')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalledWith(
      'Tu sesión expiró, vuelve a iniciar sesión',
    );
  });
});
