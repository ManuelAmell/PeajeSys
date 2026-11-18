import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderConProveedores, screen, waitFor, within } from '@/test/render';
import OperadorPage from './routes';
import { reiniciarDb } from '@/mocks/db';

describe('Feature Operador (Terminal de cobro y cierre de turno)', () => {
  beforeEach(() => {
    // Restaurar base de datos simulada en memoria antes de cada prueba
    reiniciarDb();
  });

  const usuarioOperador = {
    id: '2',
    codigo: 'EMP-002',
    nombre: 'María Fernanda López Martínez',
    rol: 'RECAUDADOR' as const,
  };

  it('renderiza la terminal de cobro con turno 9 abierto y datos del operador', async () => {
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuarioOperador,
    });

    // Verificar elemento propio de la pantalla (no solo h1)
    expect(await screen.findByRole('heading', { name: /Terminal de cobro/i })).toBeInTheDocument();
    expect(screen.getByText(/María Fernanda López Martínez/i)).toBeInTheDocument();
    expect(screen.getByText(/Carril 2 · manual/i)).toBeInTheDocument();
    expect(screen.getByText(/^Turno$/i)).toBeInTheDocument();
    expect(screen.getByText(/9 ·/i)).toBeInTheDocument();
    expect(screen.getByText('ABIERTO')).toBeInTheDocument();

    // Campo de placa
    expect(screen.getByLabelText(/^Placa/i)).toBeInTheDocument();

    // 7 categorías de vehículos con siluetas
    const botonesCat = screen.getAllByRole('button', { name: /^[I|V|X]+/i });
    expect(botonesCat.length).toBeGreaterThanOrEqual(7);

    // Métodos de pago
    expect(screen.getByRole('button', { name: /Efectivo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Telepeaje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exento/i })).toBeInTheDocument();

    // Resumen de caja: fondo inicial $ 100.000 y recaudado $ 10.500
    expect(screen.getAllByText(/\$ 100\.000/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/\$ 10\.500/i).length).toBeGreaterThanOrEqual(2);
  });

  it('registra cobro en efectivo con cambio exacto y devuelve el foco a la placa', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    await user.type(inputPlaca, 'GHJ357');

    // Categoría I seleccionada por defecto con tarifa 10.500
    const inputRecibido = screen.getByLabelText(/Valor recibido/i);
    await user.type(inputRecibido, '20000');

    // Verificación del cambio calculado en vivo: 20000 - 10500 = 9500
    expect(screen.getByText(/Cambio a entregar/i)).toBeInTheDocument();
    expect(screen.getByText(/^\$ 9\.500$/i)).toBeInTheDocument();

    // El botón de cobro debe habilitarse
    const botonCobrar = screen.getByRole('button', { name: /Cobrar \$ 10\.500 y emitir ticket/i });
    expect(botonCobrar).toBeEnabled();

    // Ejecutar cobro
    await user.click(botonCobrar);

    // Verificar aviso de confirmación emitido
    expect((await screen.findAllByText(/Ticket TCK-/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/GHJ357 · Cat\. I · EFECTIVO/i)).toBeInTheDocument();

    // Verificar que los campos se limpiaron y el foco volvió a la placa
    expect(inputPlaca).toHaveValue('');
    expect(inputRecibido).toHaveValue('');
    await waitFor(() => expect(inputPlaca).toHaveFocus());
  });

  it('muestra faltante y bloquea el cobro cuando el dinero recibido es insuficiente', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    await user.type(inputPlaca, 'GHJ357');

    const inputRecibido = screen.getByLabelText(/Valor recibido/i);
    await user.type(inputRecibido, '5000');

    // Tarifa 10.500 - 5.000 = Faltan 5.500
    expect(screen.getByText(/Falta por cobrar/i)).toBeInTheDocument();
    expect(screen.getByText(/^\$ 5\.500$/i)).toBeInTheDocument();
    expect(screen.getByText(/Faltan \$ 5\.500 para cubrir el peaje/i)).toBeInTheDocument();

    const botonCobrar = screen.getByRole('button', { name: /Cobrar/i });
    expect(botonCobrar).toBeDisabled();
  });

  it('detecta automáticamente la categoría de una placa registrada y avisa si se cambia', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    // KJN456 está registrada en el DML como CAT_II
    await user.type(inputPlaca, 'KJN456');

    // Esperar a que la consulta detecte el vehículo
    await waitFor(
      () => {
        expect(screen.getByText(/Vehículo registrado/i)).toBeInTheDocument();
        expect(screen.getByText(/categoría II/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // La categoría II debe estar activa
    const botonCat2 = screen.getByRole('button', { name: /^II\b/i });
    expect(botonCat2).toHaveAttribute('aria-pressed', 'true');

    // Si el operador cambia manualmente a CAT_I
    const botonCat1 = screen.getByRole('button', { name: /^I\b/i });
    await user.click(botonCat1);

    // Debe mostrar la advertencia
    expect(
      screen.getByText(/La categoría registrada de KJN456 es II\. Revisa los ejes antes de cobrar\./i),
    ).toBeInTheDocument();
  });

  it('permite telepeaje en carril mixto con saldo suficiente y descuenta el peaje', async () => {
    const user = userEvent.setup();
    // Forzamos modo carril mixto mediante query parameter
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador?carril=mixto'],
      usuarioInicial: usuarioOperador,
    });

    expect(await screen.findByText(/mixto/i)).toBeInTheDocument();

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    // HKL123 es CAT_I (tarifa 10500), saldo 150000, ACTIVA
    await user.type(inputPlaca, 'HKL123');

    // Seleccionar Telepeaje
    const botonTelepeaje = screen.getByRole('button', { name: /Telepeaje/i });
    expect(botonTelepeaje).toBeEnabled();
    await user.click(botonTelepeaje);

    // Esperar detalle de telepeaje
    await waitFor(
      () => {
        expect(screen.getByText(/TAG-COL-9900112233/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Saldo después del cobro: 150000 - 10500 = 139500
    expect(screen.getByText(/^\$ 150\.000$/i)).toBeInTheDocument();
    expect(screen.getByText(/^\$ 139\.500$/i)).toBeInTheDocument();

    const botonCobrar = screen.getByRole('button', { name: /Cobrar \$ 10\.500 y emitir ticket/i });
    expect(botonCobrar).toBeEnabled();
    await user.click(botonCobrar);

    // Confirmación emitida
    expect((await screen.findAllByText(/Ticket TCK-/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/saldo restante \$ 139\.500/i)).toBeInTheDocument();
  });

  it('bloquea el cobro por telepeaje si el saldo es insuficiente (caso QWE321)', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador?carril=mixto'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    // QWE321: categoría III (tarifa 15300), saldo 8000, ACTIVA
    await user.type(inputPlaca, 'QWE321');

    const botonTelepeaje = screen.getByRole('button', { name: /Telepeaje/i });
    await user.click(botonTelepeaje);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Saldo insuficiente/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 4000 },
    );
    expect(
      screen.getAllByText(/la cuenta tiene \$ 8\.000 y el peaje cuesta \$ 15\.300/i).length,
    ).toBeGreaterThanOrEqual(1);

    const botonCobrar = screen.getByRole('button', { name: /Cobrar/i });
    expect(botonCobrar).toBeDisabled();
  });

  it('bloquea el cobro por telepeaje si la cuenta está suspendida (caso ZXC987)', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador?carril=mixto'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    // ZXC987: cuenta SUSPENDIDA
    await user.type(inputPlaca, 'ZXC987');

    const botonTelepeaje = screen.getByRole('button', { name: /Telepeaje/i });
    await user.click(botonTelepeaje);

    await waitFor(
      () => {
        expect(screen.getAllByText(/está SUSPENDIDA: cobra en efectivo/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 4000 },
    );

    const botonCobrar = screen.getByRole('button', { name: /Cobrar/i });
    expect(botonCobrar).toBeDisabled();
  });

  it('permite registrar paso con método exento a monto $ 0', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador'],
      usuarioInicial: usuarioOperador,
    });

    const inputPlaca = await screen.findByLabelText(/^Placa/i);
    await user.type(inputPlaca, 'OFJ123');

    const botonExento = screen.getByRole('button', { name: /Exento/i });
    await user.click(botonExento);

    expect(screen.getByText(/El paso se registra con estado EXENTO y monto \$ 0/i)).toBeInTheDocument();

    const botonCobrar = screen.getByRole('button', { name: /Registrar paso exento/i });
    expect(botonCobrar).toBeEnabled();
    await user.click(botonCobrar);

    expect((await screen.findAllByText(/Ticket TCK-/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/OFJ123 · Cat\. I · EXENTO · \$ 0/i)).toBeInTheDocument();
  });

  it('apoya atajos de teclado para selección de categoría y método de pago', async () => {
    const user = userEvent.setup();
    renderConProveedores(<OperadorPage />, {
      initialEntries: ['/operador?carril=mixto'],
      usuarioInicial: usuarioOperador,
    });

    await screen.findByRole('heading', { name: /Terminal de cobro/i });

    // Presionar tecla '3' fuera de un input selecciona CAT_III
    await user.keyboard('3');
    expect(screen.getByRole('button', { name: /^III\b/i })).toHaveAttribute('aria-pressed', 'true');

    // Presionar F2 selecciona Telepeaje
    await user.keyboard('{F2}');
    expect(screen.getByRole('button', { name: /Telepeaje/i })).toHaveAttribute('aria-pressed', 'true');

    // Presionar F1 selecciona Efectivo
    await user.keyboard('{F1}');
    expect(screen.getByRole('button', { name: /Efectivo/i })).toHaveAttribute('aria-pressed', 'true');
  });

  describe('Cierre de turno y diagnóstico de arqueo', () => {
    it('abre el diálogo, atrapa el foco y se cierra con Escape', async () => {
      const user = userEvent.setup();
      renderConProveedores(<OperadorPage />, {
        initialEntries: ['/operador'],
        usuarioInicial: usuarioOperador,
      });

      const botonAbrirCierre = await screen.findByRole('button', { name: /Cerrar turno/i });
      await user.click(botonAbrirCierre);

      // Verificar que el diálogo se abre
      const dialogo = screen.getByRole('dialog', { name: /Cerrar turno/i });
      expect(dialogo).toBeInTheDocument();

      const inputDeclarado = within(dialogo).getByLabelText(/Efectivo recaudado que entregas/i);
      expect(inputDeclarado).toHaveFocus();

      // Cerrar con Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(botonAbrirCierre).toHaveFocus();
    });

    it('calcula diagnósticos CUADRADO, SOBRANTE y FALTANTE en vivo y confirma cierre', async () => {
      const user = userEvent.setup();
      renderConProveedores(<OperadorPage />, {
        initialEntries: ['/operador'],
        usuarioInicial: usuarioOperador,
      });

      const botonAbrirCierre = await screen.findByRole('button', { name: /Cerrar turno/i });
      await user.click(botonAbrirCierre);

      const dialogo = screen.getByRole('dialog', { name: /Cerrar turno/i });
      const inputDeclarado = within(dialogo).getByLabelText(/Efectivo recaudado que entregas/i);

      // Recaudado es 10500. Probar FALTANTE: declarar 10.000 (-500)
      await user.type(inputDeclarado, '10000');
      expect(within(dialogo).getByText('FALTANTE (−)')).toBeInTheDocument();
      expect(within(dialogo).getByText(/− \$ 500/i)).toBeInTheDocument();

      // Probar SOBRANTE: declarar 12.000 (+1500)
      await user.clear(inputDeclarado);
      await user.type(inputDeclarado, '12000');
      expect(within(dialogo).getByText('SOBRANTE (+)')).toBeInTheDocument();
      expect(within(dialogo).getByText(/\+ \$ 1\.500/i)).toBeInTheDocument();

      // Probar CUADRADO: declarar 10.500 (diferencia 0)
      await user.clear(inputDeclarado);
      await user.type(inputDeclarado, '10500');
      expect(within(dialogo).getByText('CUADRADO')).toBeInTheDocument();

      // Confirmar cierre
      const botonConfirmar = within(dialogo).getByRole('button', { name: /Confirmar cierre/i });
      expect(botonConfirmar).toBeEnabled();
      await user.click(botonConfirmar);

      // Esperar que el diálogo se cierre y el estado pase a CERRADO
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText('CERRADO')).toBeInTheDocument();

      // El botón de cobro ahora debe reflejar que el turno está cerrado
      expect(screen.getByRole('button', { name: /Turno cerrado/i })).toBeDisabled();
      expect(screen.getByText(/El turno está cerrado: ya no se pueden registrar pasos/i)).toBeInTheDocument();
    });
  });

  describe('Estados de datos y control de simulación (?mock=...)', () => {
    it('muestra estado cargando cuando ?mock=lento', async () => {
      renderConProveedores(<OperadorPage />, {
        initialEntries: ['/operador?mock=lento'],
        usuarioInicial: usuarioOperador,
      });

      expect(
        await screen.findByText(/Cargando el turno y las tarifas vigentes/i),
      ).toBeInTheDocument();
    });

    it('muestra estado de error con opción de reintentar cuando ?mock=error', async () => {
      renderConProveedores(<OperadorPage />, {
        initialEntries: ['/operador?mock=error'],
        usuarioInicial: usuarioOperador,
      });

      expect(await screen.findByText(/No se pudo cargar el turno/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    });

    it('muestra estado vacío cuando el operador no tiene un turno abierto asignado', async () => {
      // EMP-001 no tiene turno abierto en el estado final del DML (turno 8 cerrado)
      const usuarioSinTurno = {
        id: '1',
        codigo: 'EMP-001',
        nombre: 'Carlos Gómez',
        rol: 'RECAUDADOR' as const,
      };

      renderConProveedores(<OperadorPage />, {
        initialEntries: ['/operador'],
        usuarioInicial: usuarioSinTurno,
      });

      expect(await screen.findByText(/No tienes un turno abierto asignado/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ir al inicio de sesión/i })).toBeInTheDocument();
    });
  });
});
