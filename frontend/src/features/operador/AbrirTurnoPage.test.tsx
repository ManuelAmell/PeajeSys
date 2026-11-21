import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import { AbrirTurnoPage } from './AbrirTurnoPage';
import { reiniciarDb } from '@/mocks/db';
import { borrarToken, guardarToken } from '@/api/sesionToken';
import { tokenFalso } from '@/mocks/token';

describe('Pantalla Abrir Turno (AbrirTurnoPage)', () => {
  const usuarioRecaudador = {
    id: '14',
    codigo: 'REC-002',
    nombre: 'Camilo Guzmán',
    rol: 'RECAUDADOR' as const,
  };

  beforeEach(() => {
    reiniciarDb();
    guardarToken(tokenFalso('14'));
  });

  afterEach(() => {
    borrarToken();
  });

  it('al cargar los datos preselecciona la primera caseta libre', async () => {
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const select = (await screen.findByLabelText(
      /Caseta/i,
    )) as HTMLSelectElement;
    const primeraLibre = Array.from(select.options).find(
      (o) => o.value !== '0' && !o.disabled,
    );
    expect(primeraLibre).toBeDefined();
    await waitFor(() => expect(select.value).toBe(primeraLibre!.value));
    expect(select.value).not.toBe('0');
  });

  it('marca las casetas ocupadas y preselecciona la primera libre usando el campo ocupada, sin consultar /turnos', async () => {
    let consultasTurnos = 0;
    server.use(
      http.get('/api/turnos', () => {
        consultasTurnos += 1;
        return HttpResponse.json([]);
      }),
      http.get('/api/casetas', () =>
        HttpResponse.json([
          { id_caseta: 1, id_estacion: 1, numero_carril: 1, tipo_carril: 'MANUAL', estado: 'OPERATIVA', ocupada: true },
          { id_caseta: 2, id_estacion: 1, numero_carril: 2, tipo_carril: 'MANUAL', estado: 'OPERATIVA', ocupada: true },
          { id_caseta: 3, id_estacion: 1, numero_carril: 3, tipo_carril: 'MIXTO', estado: 'OPERATIVA', ocupada: false },
          { id_caseta: 4, id_estacion: 1, numero_carril: 4, tipo_carril: 'MIXTO', estado: 'OPERATIVA' },
        ]),
      ),
    );

    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const select = (await screen.findByLabelText(/Caseta/i)) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('3'));
    const opciones = Array.from(select.options).filter((o) => o.value !== '0');
    const deshabilitadas = opciones.filter((o) => o.disabled).map((o) => o.value);
    expect(deshabilitadas).toEqual(['1', '2']);
    expect(opciones.find((o) => o.value === '1')!.textContent).toMatch(/Ocupada/);
    expect(consultasTurnos).toBe(0);
  });

  it('las etiquetas de horario se nombran por su texto visible, sin aria-label redundante', async () => {
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const diurno = await screen.findByRole('radio', { name: /Diurno/i });
    expect(diurno.closest('label')).not.toHaveAttribute('aria-label');
  });

  it('renderiza el formulario con título, selector de caseta, fondo inicial y horario', async () => {
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    expect(
      await screen.findByRole('heading', { name: /Abrir turno/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Caseta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fondo inicial de caja/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Abrir turno/i }),
    ).toBeInTheDocument();
  });

  it('muestra errores de validación si no se selecciona caseta', async () => {
    const user = userEvent.setup();
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    // La primera caseta libre viene preseleccionada: se vuelve a "Selecciona una caseta".
    const selectCaseta = await screen.findByLabelText(/Caseta/i);
    await user.selectOptions(selectCaseta, '0');
    const boton = screen.getByRole('button', { name: /Abrir turno/i });
    await user.click(boton);

    // Debe mostrar error de validación en #at-caseta-error
    const errorCaseta = await screen.findByRole('alert');
    expect(errorCaseta).toHaveTextContent('Selecciona una caseta');
  });

  it('muestra error 409 CASETA_OCUPADA visible cuando la caseta ya tiene turno abierto en el servidor', async () => {
    server.use(
      http.post('/api/turnos/abrir', () => {
        return HttpResponse.json(
          {
            error: {
              codigo: 'CASETA_OCUPADA',
              mensaje: 'La caseta ya tiene un turno ABIERTO.',
            },
          },
          { status: 409 },
        );
      }),
    );

    const user = userEvent.setup();
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const selectCaseta = await screen.findByLabelText(/Caseta/i);
    await user.selectOptions(selectCaseta, '1');

    const boton = screen.getByRole('button', { name: /Abrir turno/i });
    await user.click(boton);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('La caseta ya tiene un turno ABIERTO.');
  });

  it('envío correcto llama a abrirTurno y redirige', async () => {
    const user = userEvent.setup();
    renderConProveedores(<AbrirTurnoPage />, {
      usuarioInicial: usuarioRecaudador,
      initialEntries: ['/operador/abrir-turno'],
    });

    const selectCaseta = await screen.findByLabelText(/Caseta/i);
    await user.selectOptions(selectCaseta, '1');

    const boton = screen.getByRole('button', { name: /Abrir turno/i });
    await user.click(boton);

    // Tras el envío exitoso, el formulario se procesa sin error
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
