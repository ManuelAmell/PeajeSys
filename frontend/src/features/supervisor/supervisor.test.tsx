import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderConProveedores, screen, waitFor } from '@/test/render';
import SupervisorPage from './routes';

const usuarioSupervisor = {
  id: 'EMP-003',
  nombre: 'Juan David Rodríguez Silva',
  rol: 'SUPERVISOR' as const,
};

describe('Panel de Supervisión (B4)', () => {
  it('renderiza la cabecera con el rol SUPERVISOR y el título de la vista', async () => {
    renderConProveedores(<SupervisorPage />, {
      initialEntries: ['/supervisor'],
      usuarioInicial: usuarioSupervisor,
    });

    expect(await screen.findByRole('heading', { level: 1, name: /Arqueo y conciliación de turnos/i })).toBeInTheDocument();
    expect(screen.getByText('Juan David Rodríguez Silva')).toBeInTheDocument();
    expect(screen.getByText('SUPERVISOR')).toBeInTheDocument();
    expect(screen.getByText(/Estación Gambote/i)).toBeInTheDocument();
  });

  it('renderiza las cuatro pestañas accesibles de supervisión y permite alternar entre ellas con teclado y clics', async () => {
    const user = userEvent.setup();
    renderConProveedores(<SupervisorPage />, {
      initialEntries: ['/supervisor'],
      usuarioInicial: usuarioSupervisor,
    });

    const navTabs = await screen.findByRole('tablist', { name: /Secciones de supervisión/i });
    expect(navTabs).toBeInTheDocument();

    const tabArqueo = screen.getByRole('tab', { name: /Arqueo de turnos/i });
    const tabRecaudo = screen.getByRole('tab', { name: /Recaudo diario/i });
    const tabAuditoria = screen.getByRole('tab', { name: /Auditoría/i });
    const tabCuentas = screen.getByRole('tab', { name: /Cuentas de telepeaje/i });

    expect(tabArqueo).toHaveAttribute('aria-selected', 'true');
    expect(tabRecaudo).toHaveAttribute('aria-selected', 'false');

    // Navegar con clic a Recaudo
    await user.click(tabRecaudo);
    expect(tabRecaudo).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: /Recaudo diario/i })).toBeInTheDocument();

    // Navegación por teclado con flechas
    tabRecaudo.focus();
    await user.keyboard('{ArrowRight}');
    expect(tabAuditoria).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(tabAuditoria).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: /Auditoría de transacciones/i })).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(tabCuentas).toHaveFocus();
    await user.keyboard('{Space}');
    expect(tabCuentas).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: /Cuentas de telepeaje/i })).toBeInTheDocument();
  });

  describe('Sección 1: Arqueo y conciliación de turnos', () => {
    it('muestra métricas resumen de turnos abiertos, descuadrados y sin conciliar', async () => {
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      expect(await screen.findByRole('heading', { level: 1, name: /Arqueo y conciliación de turnos/i })).toBeInTheDocument();

      // En la semilla: turnos 9 y 10 abiertos -> 2
      // Descuadres (cerrados con dif !== 0): turno 2 (faltante) y turno 5 (sobrante) -> 2
      // Sin conciliar (recaudado !== suma pasos efectivo): turnos 1, 2, 4, 5, 6 -> 5
      expect(screen.getByText('Turnos abiertos')).toBeInTheDocument();
      expect(screen.getByText('Con faltante o sobrante')).toBeInTheDocument();
      expect(screen.getByText('Sin conciliar con sus pasos')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('k-abiertos')).toHaveTextContent('2');
        expect(screen.getByTestId('k-descuadre')).toHaveTextContent('2');
        expect(screen.getByTestId('k-sin-conciliar')).toHaveTextContent('5');
      });
    });

    it('muestra los diagnósticos de arqueo con turnos DML: t1 CUADRADO, t2 FALTANTE, t5 SOBRANTE y turnos abiertos EN PROCESO', async () => {
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      await waitFor(() => {
        expect(screen.getByTestId('fila-turno-1')).toBeInTheDocument();
      });

      // Turno 1: declarado 315.000, recaudado 315.000 -> CUADRADO
      const filaT1 = screen.getByTestId('fila-turno-1');
      expect(filaT1).toHaveTextContent('CUADRADO');

      // Turno 2: declarado 248.000, recaudado 250.000 -> FALTANTE (−) $ 2.000
      const filaT2 = screen.getByTestId('fila-turno-2');
      expect(filaT2).toHaveTextContent(/FALTANTE/i);
      expect(filaT2).toHaveTextContent(/2\.000/);

      // Turno 5: declarado 425.000, recaudado 420.000 -> SOBRANTE (+) $ 5.000
      const filaT5 = screen.getByTestId('fila-turno-5');
      expect(filaT5).toHaveTextContent(/SOBRANTE/i);
      expect(filaT5).toHaveTextContent(/5\.000/);

      // Turnos 9 y 10: abiertos -> EN PROCESO
      const filaT9 = screen.getByTestId('fila-turno-9');
      expect(filaT9).toHaveTextContent('EN PROCESO');
      expect(filaT9).toHaveTextContent('Turno abierto');
    });

    it('señala con precisión los turnos que no concilian con sus pasos en efectivo (t5: discrepancia 371.500)', async () => {
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      await waitFor(() => {
        expect(screen.getByTestId('fila-turno-5')).toBeInTheDocument();
      });

      // Turno 5: recaudado 420.000, pasos en efectivo 48.500 -> No concilia: $ 371.500 sin pasos
      const filaT5 = screen.getByTestId('fila-turno-5');
      expect(filaT5).toHaveTextContent('No concilia: $ 371.500 sin pasos');

      // Turnos que concilian: turno 8 concilia exactamente (52.500 == 52.500)
      const filaT8 = screen.getByTestId('fila-turno-8');
      expect(filaT8).toHaveTextContent('Concilia');
    });

    it('permite filtrar la lista de turnos por fecha', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      await waitFor(() => {
        expect(screen.getByTestId('fila-turno-1')).toBeInTheDocument();
      });

      const selectFecha = screen.getByLabelText(/Fecha/i);
      await user.selectOptions(selectFecha, '2026-10-02');

      // 2026-10-02 tiene turnos 5, 6, 7
      expect(screen.queryByTestId('fila-turno-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('fila-turno-5')).toBeInTheDocument();
      expect(screen.getByTestId('fila-turno-6')).toBeInTheDocument();
      expect(screen.getByTestId('fila-turno-7')).toBeInTheDocument();
    });
  });

  describe('Sección 2: Recaudo diario', () => {
    it('muestra el gráfico proporcional accesible y el recaudo por carriles', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabRecaudo = await screen.findByRole('tab', { name: /Recaudo diario/i });
      await user.click(tabRecaudo);

      expect(await screen.findByRole('heading', { level: 1, name: /Recaudo diario/i })).toBeInTheDocument();
      expect(screen.getByText(/Vista vw_resumen_diario_estacion/i)).toBeInTheDocument();

      // Gráficos y leyendas
      expect(screen.getAllByText('Efectivo').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Telepeaje').length).toBeGreaterThanOrEqual(1);

      // Barras proporcionales con aria-label
      await waitFor(() => {
        const barrasImg = screen.getAllByRole('img', { name: /efectivo.*telepeaje/i });
        expect(barrasImg.length).toBeGreaterThanOrEqual(1);
      });

      // Totales y desglose por carriles
      expect(screen.getByText(/Carril 1/i)).toBeInTheDocument();
      expect(screen.getAllByText(/MANUAL/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Carril 2/i)).toBeInTheDocument();
      expect(screen.getAllByText(/MIXTO/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sección 3: Auditoría de transacciones', () => {
    it('muestra la bitácora inmutable de transacciones con sus operaciones y motivos', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabAuditoria = await screen.findByRole('tab', { name: /Auditoría/i });
      await user.click(tabAuditoria);

      expect(await screen.findByRole('heading', { level: 1, name: /Auditoría de transacciones/i })).toBeInTheDocument();
      expect(screen.getByText(/trg_auditoria_inmutable/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText('carlos_gomez').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Paso de vehículo registrado en caja manual').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('al filtrar por tipo VOID devuelve lista vacía y muestra el estado vacío con texto requerido', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabAuditoria = await screen.findByRole('tab', { name: /Auditoría/i });
      await user.click(tabAuditoria);

      await screen.findByRole('heading', { level: 1, name: /Auditoría de transacciones/i });

      const selectOperacion = screen.getByLabelText(/Operación/i);
      await user.selectOptions(selectOperacion, 'VOID');

      // Estado vacío requerido para E2E de B6
      await waitFor(() => {
        expect(screen.getByText('No hay eventos con ese filtro')).toBeInTheDocument();
        expect(screen.getByText('Prueba con otra operación o borra la búsqueda.')).toBeInTheDocument();
      });
    });

    it('permite buscar en auditoría por texto o usuario', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabAuditoria = await screen.findByRole('tab', { name: /Auditoría/i });
      await user.click(tabAuditoria);

      const inputBuscar = screen.getByLabelText(/Buscar ticket o usuario/i);
      await user.type(inputBuscar, 'juan_rodriguez');

      await waitFor(() => {
        expect(screen.getByText('juan_rodriguez')).toBeInTheDocument();
        expect(screen.getByText(/Ajuste supervisor por revisión de categoría/i)).toBeInTheDocument();
        expect(screen.queryByText('Paso de vehículo registrado en caja manual')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sección 4: Cuentas de telepeaje', () => {
    it('muestra las cuentas ordenadas por saldo ascendente con condiciones SIN SALDO, SALDO CRÍTICO y SALDO SUFICIENTE', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabCuentas = await screen.findByRole('tab', { name: /Cuentas de telepeaje/i });
      await user.click(tabCuentas);

      expect(await screen.findByRole('heading', { level: 1, name: /Cuentas de telepeaje/i })).toBeInTheDocument();
      expect(screen.getByText(/vw_estado_cuentas_telepeaje/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('ZXC987')).toBeInTheDocument();
        expect(screen.getByText('QWE321')).toBeInTheDocument();
        expect(screen.getByText('GHJ357')).toBeInTheDocument();
      });

      // ZXC987: saldo 0, suspendida -> SIN SALDO
      const filaZXC = screen.getByTestId('fila-cuenta-ZXC987');
      expect(filaZXC).toHaveTextContent('SIN SALDO');
      expect(filaZXC).toHaveTextContent('SUSPENDIDA');

      // QWE321: saldo 8.000 -> SALDO CRÍTICO (< 10.000)
      const filaQWE = screen.getByTestId('fila-cuenta-QWE321');
      expect(filaQWE).toHaveTextContent('SALDO CRÍTICO');
      expect(filaQWE).toHaveTextContent('$ 8.000');

      // GHJ357: saldo 32.000 -> SALDO SUFICIENTE
      const filaGHJ = screen.getByTestId('fila-cuenta-GHJ357');
      expect(filaGHJ).toHaveTextContent('SALDO SUFICIENTE');
      expect(filaGHJ).toHaveTextContent('$ 32.000');
    });

    it('permite filtrar cuentas de telepeaje por placa o TAG', async () => {
      const user = userEvent.setup();
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      const tabCuentas = await screen.findByRole('tab', { name: /Cuentas de telepeaje/i });
      await user.click(tabCuentas);

      const inputBuscar = screen.getByLabelText(/Buscar placa o TAG/i);
      await user.type(inputBuscar, 'HKL123');

      await waitFor(() => {
        expect(screen.getByText('HKL123')).toBeInTheDocument();
        expect(screen.queryByText('ZXC987')).not.toBeInTheDocument();
      });
    });
  });

  describe('Estados de datos (cargando, error con Reintentar)', () => {
    it('muestra el estado de error cuando el servidor falla y permite reintentar', async () => {
      server.use(
        http.get('/api/turnos', () => {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_SIMULADO', mensaje: 'Fallo simulado' } },
            { status: 500 },
          );
        }),
      );

      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor'],
        usuarioInicial: usuarioSupervisor,
      });

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('No se pudieron cargar los datos de la estación')).toBeInTheDocument();
      expect(screen.getByText(/El servidor no respondió/i)).toBeInTheDocument();

      const btnReintentar = screen.getByRole('button', { name: /Reintentar/i });
      expect(btnReintentar).toBeInTheDocument();
    });

    it('soporta forzar el estado de error mediante la ruta /supervisor/error', async () => {
      renderConProveedores(<SupervisorPage />, {
        initialEntries: ['/supervisor/error'],
        usuarioInicial: usuarioSupervisor,
      });

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('No se pudieron cargar los datos de la estación')).toBeInTheDocument();
    });
  });
});
