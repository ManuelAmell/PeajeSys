import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderConProveedores, screen } from '@/test/render';
import { SeccionCategorias } from './SeccionCategorias';
import { SeccionEstaciones } from './SeccionEstaciones';

const admin = {
  id: 'ADMIN-01',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
  codigo: 'ADMIN-01',
};

describe('Sección Estaciones y casetas (solo lectura, datos del DML)', () => {
  it('muestra las dos estaciones con código, ubicación, sentido y estado', async () => {
    renderConProveedores(<SeccionEstaciones />, { usuarioInicial: admin });

    expect(
      await screen.findByRole('heading', { name: 'Estaciones y casetas' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Estación Gambote')).toBeInTheDocument();
    expect(
      screen.getByText(
        'PEA-GAM-01 · Km 25 Vía Ruta del Sol - Tramo Gambote · sentido BOGOTA-CARTAGENA',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Estación La Ceballos')).toBeInTheDocument();
    expect(
      screen.getByText(
        'PEA-CEB-02 · Km 12 Variante Mamonal · sentido CARTAGENA-BARRANQUILLA',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Consulta de solo lectura en esta versión del diseño.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ACTIVA')).toHaveLength(2);
  });

  it('lista las 6 casetas por carril con tipo y estado', async () => {
    renderConProveedores(<SeccionEstaciones />, { usuarioInicial: admin });

    expect(await screen.findByText(/Carril 4/)).toBeInTheDocument();
    expect(screen.getAllByText(/Carril 1/)).toHaveLength(2);
    expect(screen.getAllByText(/Telepeaje exclusivo/)).toHaveLength(2);
    expect(screen.getByText(/Mixto/)).toBeInTheDocument();
    expect(screen.getAllByText('OPERATIVA').length).toBeGreaterThanOrEqual(6);
  });

  it('no ofrece ninguna acción de edición', async () => {
    renderConProveedores(<SeccionEstaciones />, { usuarioInicial: admin });

    await screen.findByText('Estación Gambote');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra estado de error con Reintentar', async () => {
    server.use(
      http.get('*/api/casetas', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'ERROR_SIMULADO',
              mensaje: 'Error de servidor simulado.',
            },
          },
          { status: 500 },
        ),
      ),
    );
    renderConProveedores(<SeccionEstaciones />, { usuarioInicial: admin });

    expect(
      await screen.findByText('No se pudieron cargar los datos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay estaciones', async () => {
    server.use(http.get('*/api/estaciones', () => HttpResponse.json([])));
    renderConProveedores(<SeccionEstaciones />, { usuarioInicial: admin });

    expect(
      await screen.findByText('No hay estaciones registradas'),
    ).toBeInTheDocument();
  });
});

describe('Sección Categorías vehiculares (solo lectura, datos del DML)', () => {
  it('muestra las 7 categorías con silueta, código, ejes y peso máximo', async () => {
    renderConProveedores(<SeccionCategorias />, { usuarioInicial: admin });

    expect(
      await screen.findByRole('heading', { name: 'Categorías vehiculares' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Esquema de siete categorías (Res. INVÍAS 0228 de 2013 y concesiones ANI). Consulta de solo lectura.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('CAT_I')).toBeInTheDocument();
    expect(
      screen.getByText('Automóviles, camperos y camionetas'),
    ).toBeInTheDocument();
    expect(screen.getByText('CAT_VII')).toBeInTheDocument();
    expect(
      screen.getByText('Camiones de 6 o más ejes (C6)'),
    ).toBeInTheDocument();
    expect(screen.getByText('3 a 4')).toBeInTheDocument();
    expect(screen.getByText('3,5 t')).toBeInTheDocument();
    expect(screen.getByText('52 t')).toBeInTheDocument();
    expect(screen.getAllByAltText('')).toHaveLength(7);
    expect(screen.getAllByAltText('')[0]).toHaveAttribute(
      'src',
      '/img/cat-1.png',
    );
  });

  it('no ofrece ninguna acción de edición', async () => {
    renderConProveedores(<SeccionCategorias />, { usuarioInicial: admin });

    await screen.findByText('CAT_I');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra estado de error con Reintentar', async () => {
    server.use(
      http.get('*/api/categorias', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'ERROR_SIMULADO',
              mensaje: 'Error de servidor simulado.',
            },
          },
          { status: 500 },
        ),
      ),
    );
    renderConProveedores(<SeccionCategorias />, { usuarioInicial: admin });

    expect(
      await screen.findByText('No se pudieron cargar los datos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay categorías', async () => {
    server.use(http.get('*/api/categorias', () => HttpResponse.json([])));
    renderConProveedores(<SeccionCategorias />, { usuarioInicial: admin });

    expect(
      await screen.findByText('No hay categorías registradas'),
    ).toBeInTheDocument();
  });
});
