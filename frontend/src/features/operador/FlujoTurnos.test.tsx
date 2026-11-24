import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderConProveedores, screen, within } from '@/test/render';
import OperadorPage from './routes';
import { reiniciarDb } from '@/mocks/db';
import { borrarToken, guardarToken } from '@/api/sesionToken';
import { tokenFalso } from '@/mocks/token';

// Se monta como en el router real (/operador/*), donde abrir-turno es una ruta relativa.
function montarOperador(usuario: {
  id: string;
  codigo: string;
  nombre: string;
  rol: 'RECAUDADOR';
}) {
  return renderConProveedores(
    <Routes>
      <Route path="/operador/*" element={<OperadorPage />} />
    </Routes>,
    { initialEntries: ['/operador'], usuarioInicial: usuario },
  );
}

async function abrirTurnoEnPrimeraCasetaLibre(
  user: ReturnType<typeof userEvent.setup>,
) {
  const select = (await screen.findByLabelText(/Caseta/i)) as HTMLSelectElement;
  const libre = Array.from(select.options).find(
    (o) => o.value !== '0' && !o.disabled,
  );
  await user.selectOptions(select, libre!.value);
  await user.click(screen.getByRole('button', { name: /^Abrir turno$/i }));
}

describe('Flujo de turnos del operador', () => {
  beforeEach(() => {
    reiniciarDb();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    borrarToken();
  });

  it('tras abrir un turno lleva a la terminal de cobro aunque la lista de turnos abiertos estuviera en caché vacía', async () => {
    // Carlos Alberto Gómez Pérez (EMP-001) no tiene turno abierto en la semilla.
    guardarToken(tokenFalso('1'));
    const user = userEvent.setup();
    montarOperador({
      id: '1',
      codigo: 'EMP-001',
      nombre: 'Carlos Alberto Gómez Pérez',
      rol: 'RECAUDADOR',
    });

    // La terminal no encuentra turno abierto y redirige a Abrir turno (caché queda en []).
    await abrirTurnoEnPrimeraCasetaLibre(user);

    expect(
      await screen.findByRole('heading', { name: /Terminal de cobro/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABIERTO')).toBeInTheDocument();
  });

  it('tras cerrar el turno ofrece abrir uno nuevo y lleva a la pantalla Abrir turno', async () => {
    // María Fernanda López Martínez (EMP-002) tiene el turno 9 abierto en la semilla.
    guardarToken(tokenFalso('2'));
    const user = userEvent.setup();
    montarOperador({
      id: '2',
      codigo: 'EMP-002',
      nombre: 'María Fernanda López Martínez',
      rol: 'RECAUDADOR',
    });

    await user.click(
      await screen.findByRole('button', { name: /Cerrar turno/i }),
    );
    const dialogo = screen.getByRole('dialog', { name: /Cerrar turno/i });
    await user.type(
      within(dialogo).getByLabelText(/Efectivo recaudado que entregas/i),
      '10500',
    );
    await user.click(
      within(dialogo).getByRole('button', { name: /Confirmar cierre/i }),
    );

    const botonNuevo = await screen.findByRole('button', {
      name: /Abrir nuevo turno/i,
    });
    await user.click(botonNuevo);

    expect(
      await screen.findByRole('heading', { name: /^Abrir turno$/i }),
    ).toBeInTheDocument();
  });

  it('el ciclo completo cerrar y abrir otro turno termina en la terminal sin volver a iniciar sesión', async () => {
    guardarToken(tokenFalso('2'));
    const user = userEvent.setup();
    montarOperador({
      id: '2',
      codigo: 'EMP-002',
      nombre: 'María Fernanda López Martínez',
      rol: 'RECAUDADOR',
    });

    await user.click(
      await screen.findByRole('button', { name: /Cerrar turno/i }),
    );
    const dialogo = screen.getByRole('dialog', { name: /Cerrar turno/i });
    await user.type(
      within(dialogo).getByLabelText(/Efectivo recaudado que entregas/i),
      '10500',
    );
    await user.click(
      within(dialogo).getByRole('button', { name: /Confirmar cierre/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /Abrir nuevo turno/i }),
    );

    await abrirTurnoEnPrimeraCasetaLibre(user);

    expect(
      await screen.findByRole('heading', { name: /Terminal de cobro/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABIERTO')).toBeInTheDocument();
  });
});
