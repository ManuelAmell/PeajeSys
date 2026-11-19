import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import { RequireRol } from '@/lib/sesion';
import { AdminPage } from './routes';

const admin = {
  id: 'ADMIN-01',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
  codigo: 'ADMIN-01',
};

const recaudadora = {
  id: 'EMP-002',
  nombre: 'María Fernanda López Martínez',
  rol: 'RECAUDADOR' as const,
  codigo: 'EMP-002',
};

function ArnésGuardia() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <RequireRol rolPermitido="ADMIN">
            <AdminPage />
          </RequireRol>
        }
      />
      <Route path="/login" element={<p>pagina-login</p>} />
      <Route path="/operador" element={<p>pagina-operador</p>} />
      <Route path="/supervisor" element={<p>pagina-supervisor</p>} />
    </Routes>
  );
}

describe('Página de administración (/admin)', () => {
  it('abre en la pestaña Tarifas con el usuario ADMIN de la sesión', async () => {
    renderConProveedores(<AdminPage />, {
      usuarioInicial: admin,
      initialEntries: ['/admin'],
    });

    expect(
      await screen.findByRole('heading', { name: 'Tarifas por estación' }),
    ).toBeInTheDocument();
  });

  it('muestra la navegación del prototipo con la pestaña activa marcada', async () => {
    renderConProveedores(<AdminPage />, {
      usuarioInicial: admin,
      initialEntries: ['/admin'],
    });

    const navegacion = await screen.findByRole('navigation', {
      name: 'Secciones de administración',
    });
    expect(navegacion).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tarifas', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Personal', pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Estaciones y casetas',
        pressed: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Categorías', pressed: false }),
    ).toBeInTheDocument();
  });

  it('cambia a Personal, Estaciones y Categorías al activar cada pestaña', async () => {
    const usuario = userEvent.setup();
    renderConProveedores(<AdminPage />, {
      usuarioInicial: admin,
      initialEntries: ['/admin'],
    });

    await usuario.click(
      await screen.findByRole('button', { name: 'Personal' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Personal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Personal', pressed: true }),
    ).toBeInTheDocument();

    await usuario.click(
      screen.getByRole('button', { name: 'Estaciones y casetas' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Estaciones y casetas' }),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Categorías' }));
    expect(
      await screen.findByRole('heading', { name: 'Categorías vehiculares' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Estaciones y casetas' }),
      ).not.toBeInTheDocument();
    });
  });

  it('solo el rol administrador entra: RECAUDADOR es redirigido a /operador', async () => {
    renderConProveedores(<ArnésGuardia />, {
      usuarioInicial: recaudadora,
      initialEntries: ['/admin'],
    });

    await waitFor(() => {
      expect(screen.getByText('pagina-operador')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: 'Tarifas por estación' }),
    ).not.toBeInTheDocument();
  });

  it('sin sesión redirige a /login', async () => {
    renderConProveedores(<ArnésGuardia />, {
      initialEntries: ['/admin'],
    });

    await waitFor(() => {
      expect(screen.getByText('pagina-login')).toBeInTheDocument();
    });
  });
});
