import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderConProveedores, screen } from '@/test/render';
import { Cabecera } from '@/components/layout/Cabecera';
import { Rol } from '@/lib/roles';
import AuthPage from './routes';

function renderConRutas(
  opciones: Parameters<typeof renderConProveedores>[1] = {},
) {
  return renderConProveedores(
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/operador"
        element={
          <section>
            <h1>Terminal de cobro</h1>
            <Cabecera />
          </section>
        }
      />
      <Route
        path="/supervisor"
        element={
          <section>
            <h1>Supervisión</h1>
            <Cabecera />
          </section>
        }
      />
      <Route
        path="/admin"
        element={
          <section>
            <h1>Administración</h1>
            <Cabecera />
          </section>
        }
      />
    </Routes>,
    { initialEntries: ['/login'], ...opciones },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Página de inicio de sesión (routes.tsx)', () => {
  it('muestra el encabezado, el texto y la foto del prototipo', () => {
    renderConRutas();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Inicia sesión' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Entra con tu código de empleado. El menú que ves depende de tu rol.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(
        'Estación de peaje al atardecer, con casetas bajo una cubierta, barreras amarillas y negras y conos naranjas',
      ),
    ).toHaveAttribute('src', '/img/login-estacion.webp');
  });

  it('oculta la lista de usuarios de prueba sin VITE_USAR_MOCKS', () => {
    vi.stubEnv('VITE_USAR_MOCKS', '');
    renderConRutas();

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Usuarios de prueba' }),
    ).not.toBeInTheDocument();
  });

  it('con VITE_USAR_MOCKS=true muestra la lista demo y con Usar rellena el formulario', async () => {
    vi.stubEnv('VITE_USAR_MOCKS', 'true');
    const usuario = userEvent.setup();
    renderConRutas();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Usuarios de prueba' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Simulación sin backend: cualquier contraseña sirve. Los empleados salen del DML del Avance 2.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /EMP-002 · María Fernanda López Recaudadora con el turno 9 abierto/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /ADMIN-01 · Administración Usuario solo del front/,
      }),
    ).toBeInTheDocument();

    await usuario.click(
      screen.getByRole('button', { name: /EMP-002 · María Fernanda López/ }),
    );
    expect(screen.getByLabelText('Código de empleado')).toHaveValue('EMP-002');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('prueba');
  });

  it.each([
    [
      'EMP-002',
      'María Fernanda López Martínez',
      'RECAUDADOR',
      'Terminal de cobro',
    ],
    [
      'EMP-003',
      'Juan David Rodríguez Silva',
      'SUPERVISOR',
      'Supervisión',
    ],
    ['ADMIN-01', 'Administración', 'ADMIN', 'Administración'],
  ] as const)(
    'si ya hay sesión, /login redirige a la página del rol (%s)',
    (codigo, nombre, rol, tituloDestino) => {
      renderConRutas({
        usuarioInicial: { id: codigo, nombre, rol: rol as Rol, codigo },
      });

      expect(
        screen.getByRole('heading', { level: 1, name: tituloDestino }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Inicia sesión' }),
      ).not.toBeInTheDocument();
    },
  );

  it('cerrar sesión desde la cabecera de B0 vuelve a /login y limpia la sesión', async () => {
    const usuario = userEvent.setup();
    renderConRutas({
      initialEntries: ['/operador'],
      usuarioInicial: {
        id: '3',
        nombre: 'Juan David Rodríguez Silva',
        rol: 'SUPERVISOR',
        codigo: 'EMP-003',
      },
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Supervisión' }),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Inicia sesión' }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem('peajesys_sesion')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Cerrar sesión' }),
    ).not.toBeInTheDocument();
  });
});
