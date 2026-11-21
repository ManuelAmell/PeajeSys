import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { obtenerTarifas } from '@/api/recursos/tarifas';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import { SeccionTarifas } from './SeccionTarifas';

const admin = {
  id: 'ADM-001',
  nombre: 'Administración',
  rol: 'ADMIN' as const,
  codigo: 'ADM-001',
};

function renderSeccion() {
  return renderConProveedores(<SeccionTarifas onAviso={() => {}} />, {
    usuarioInicial: admin,
  });
}

describe('Sección Tarifas por estación (Admin.dc.html)', () => {
  it('muestra las 7 categorías con las tarifas activas de Gambote de la semilla', async () => {
    renderSeccion();

    expect(
      await screen.findByRole('heading', { name: 'Tarifas por estación' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Automóviles, camperos y camionetas'),
    ).toBeInTheDocument();
    expect(screen.getByText('$ 10.500')).toBeInTheDocument();
    expect(screen.getByText('$ 48.500')).toBeInTheDocument();
    expect(screen.getAllByText('Res. MinTransporte 0045/2026')).toHaveLength(7);
    expect(screen.getAllByText('01/01/2026')).toHaveLength(7);
  });

  it('ofrece las dos estaciones del DML con su código', async () => {
    renderSeccion();

    const selector = await screen.findByLabelText('Estación');
    expect(selector).toBeInTheDocument();
    expect(
      await screen.findByRole('option', {
        name: 'Estación Gambote · PEA-GAM-01',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Estación La Ceballos · PEA-CEB-02' }),
    ).toBeInTheDocument();
  });

  it('en La Ceballos avisa las categorías sin tarifa y ofrece definirlas', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await screen.findByText('$ 10.500');
    await usuario.selectOptions(screen.getByLabelText('Estación'), '2');

    expect(
      await screen.findByRole('alert', {
        name: /no tiene tarifa para las categorías/,
      }),
    ).toHaveTextContent(
      'Estación La Ceballos no tiene tarifa para las categorías IV, V, VI, VII: esos vehículos no se podrían cobrar.',
    );
    expect(screen.getAllByText('SIN TARIFA')).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: 'Definir tarifa de la categoría IV' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Res. MinTransporte 0046/2026')).toHaveLength(3);
  });

  it('rechaza un monto 0 con el mensaje del esquema y no guarda', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', {
        name: 'Editar tarifa de la categoría I',
      }),
    );
    const dialogo = await screen.findByRole('dialog');
    expect(
      screen.getByRole('heading', { name: 'Editar tarifa · categoría I' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Estación Gambote. El cambio queda en el historial.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Estación Estación Gambote/),
    ).not.toBeInTheDocument();

    await usuario.clear(screen.getByLabelText('Monto en pesos'));
    await usuario.type(screen.getByLabelText('Monto en pesos'), '0');
    await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    expect(
      await screen.findByText('El monto debe ser mayor que 0'),
    ).toBeInTheDocument();
    expect(dialogo).toBeInTheDocument();

    const tarifas = await obtenerTarifas({ estacion: 1, categoria: 1 });
    expect(tarifas).toHaveLength(1);
    expect(tarifas[0]?.monto).toBe(10500);
  });

  it('guarda una tarifa válida: aviso, historial y la anterior queda cerrada', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', {
        name: 'Editar tarifa de la categoría I',
      }),
    );
    await usuario.clear(await screen.findByLabelText('Monto en pesos'));
    await usuario.type(screen.getByLabelText('Monto en pesos'), '11200');
    await usuario.clear(screen.getByLabelText('Vigente desde'));
    await usuario.type(screen.getByLabelText('Vigente desde'), '2026-03-01');
    await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    expect(
      await screen.findByText(
        'Tarifa de la categoría I en Estación Gambote guardada: $ 11.200.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Historial de cambios' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Estación Gambote · categoría I'),
    ).toBeInTheDocument();
    expect(screen.getByText('$ 10.500 -> $ 11.200')).toBeInTheDocument();
    expect(
      screen.getByText(/ADM-001 · Res. MinTransporte 0045\/2026/),
    ).toBeInTheDocument();

    await waitFor(async () => {
      const tarifas = await obtenerTarifas({ estacion: 1, categoria: 1 });
      expect(tarifas).toHaveLength(2);
    });
    const tarifas = await obtenerTarifas({ estacion: 1, categoria: 1 });
    const vigente = tarifas.find((t) => t.activa);
    const cerrada = tarifas.find((t) => !t.activa);
    expect(vigente?.monto).toBe(11200);
    expect(cerrada?.monto).toBe(10500);
    expect(cerrada?.fecha_fin_vigencia).toBe('2026-03-01');
    expect(await screen.findByText('$ 11.200')).toBeInTheDocument();
  });

  it('rechaza fechas incoherentes: fin anterior al inicio', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', {
        name: 'Editar tarifa de la categoría I',
      }),
    );
    await usuario.clear(screen.getByLabelText('Monto en pesos'));
    await usuario.type(screen.getByLabelText('Monto en pesos'), '11200');
    await usuario.clear(screen.getByLabelText('Vigente desde'));
    await usuario.type(screen.getByLabelText('Vigente desde'), '2026-03-01');
    await usuario.type(screen.getByLabelText('Vigente hasta'), '2026-02-28');
    await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    expect(
      await screen.findByText(
        'La fecha de fin debe ser posterior o igual a la de inicio.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Estación Gambote · categoría I'),
    ).not.toBeInTheDocument();
  });

  it('presenta el error 409 de solape en la alerta del diálogo', async () => {
    server.use(
      http.post('*/api/tarifas', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'SOLAPE_VIGENCIAS',
              mensaje:
                'Ya existe una tarifa que se solapa con las fechas indicadas.',
            },
          },
          { status: 409 },
        ),
      ),
    );

    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', {
        name: 'Editar tarifa de la categoría I',
      }),
    );
    await usuario.clear(screen.getByLabelText('Monto en pesos'));
    await usuario.type(screen.getByLabelText('Monto en pesos'), '11200');
    await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    expect(
      await screen.findByText(
        'Ya existe una tarifa que se solapa con las fechas indicadas.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cierra con Escape y devuelve el foco al botón que lo abrió', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    const botonEditar = await screen.findByRole('button', {
      name: 'Editar tarifa de la categoría I',
    });
    await usuario.click(botonEditar);
    await screen.findByRole('dialog');

    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(botonEditar).toHaveFocus();
  });

  it('lleva el foco al primer campo con error al guardar vacío', async () => {
    const usuario = userEvent.setup();
    renderSeccion();

    await usuario.click(
      await screen.findByRole('button', {
        name: 'Editar tarifa de la categoría I',
      }),
    );
    await usuario.clear(await screen.findByLabelText('Monto en pesos'));
    await usuario.clear(screen.getByLabelText('Vigente desde'));
    await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));

    await screen.findByText('El monto debe ser mayor que 0');
    expect(screen.getByLabelText('Monto en pesos')).toHaveFocus();
  });

  it('muestra estado de error con Reintentar cuando el servidor falla', async () => {
    server.use(
      http.get('*/api/estaciones', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'ERROR_SIMULADO',
              mensaje:
                'Error de servidor simulado mediante parámetro ?mock=error.',
            },
          },
          { status: 500 },
        ),
      ),
    );
    renderSeccion();

    expect(
      await screen.findByText('No se pudieron cargar los datos'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'El servidor no respondió. Para no guardar cambios sobre datos viejos, la edición queda bloqueada hasta que carguen.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay estaciones registradas', async () => {
    server.use(http.get('*/api/estaciones', () => HttpResponse.json([])));
    renderSeccion();

    expect(
      await screen.findByText('No hay estaciones registradas'),
    ).toBeInTheDocument();
  });

  it('muestra el historial vacío con el texto del prototipo', async () => {
    renderSeccion();

    await screen.findByText('$ 10.500');
    expect(
      screen.getByText(
        'Aún no hay cambios en esta sesión. Edita una tarifa para ver aquí el valor anterior y el nuevo.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'En la base de datos lo guardará el trigger trg_auditoria_tarifas, pendiente del Avance 3.',
      ),
    ).toBeInTheDocument();
  });
});
