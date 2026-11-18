import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  actualizarCategoria,
  actualizarOperador,
  actualizarTarifa,
  anularTransaccion,
  cerrarTurno,
  clienteHttp,
  crearCategoria,
  crearOperador,
  crearTarifa,
  ErrorApi,
  login,
  obtenerAuditoria,
  obtenerCasetas,
  obtenerCategorias,
  obtenerCuentaPorPlaca,
  obtenerCuentasTelepeaje,
  obtenerEstaciones,
  obtenerOperador,
  obtenerOperadores,
  obtenerRecaudo,
  obtenerTarifas,
  obtenerTransaccionesTurno,
  obtenerTurno,
  obtenerTurnos,
  obtenerVehiculo,
  registrarTransaccion,
  useCerrarTurno,
  useEstaciones,
  useLogin,
  useRegistrarTransaccion,
} from './index';

function crearWrapperQuery(queryClient?: QueryClient) {
  const qc =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  return {
    queryClient: qc,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
}

describe('Módulo de Cliente HTTP y Recursos API', () => {
  describe('clienteHttp base y manejo de errores', () => {
    it('realiza peticiones GET exitosas y valida el esquema con Zod', async () => {
      const esquemaPrueba = z.array(z.object({ id_estacion: z.number(), nombre: z.string() }));
      const resultado = await clienteHttp.get('/estaciones', { schema: esquemaPrueba });

      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
      expect(resultado[0]).toHaveProperty('id_estacion');
      expect(resultado[0]).toHaveProperty('nombre');
    });

    it('emite ErrorApi con código y estado HTTP cuando el recurso no existe (404)', async () => {
      await expect(obtenerTurno(99999)).rejects.toThrow(ErrorApi);

      try {
        await obtenerTurno(99999);
      } catch (err) {
        expect(err).toBeInstanceOf(ErrorApi);
        const errorApi = err as ErrorApi;
        expect(errorApi.estado).toBe(404);
        expect(errorApi.codigo).toBe('TURNO_NO_ENCONTRADO');
        expect(errorApi.message).toContain('Turno 99999 no encontrado');
      }
    });

    it('emite ErrorApi con campos detallados cuando falla la validación en el servidor (422)', async () => {
      try {
        await anularTransaccion({
          idTransaccion: 1,
          motivo: '', // Motivo vacío
        });
        expect.unreachable('Debería haber fallado con MOTIVO_REQUERIDO');
      } catch (err) {
        expect(err).toBeInstanceOf(ErrorApi);
        const errorApi = err as ErrorApi;
        expect(errorApi.estado).toBe(422);
        expect(errorApi.codigo).toBe('MOTIVO_REQUERIDO');
      }
    });

    it('emite ErrorApi con ERROR_VALIDACION_RESPUESTA si el JSON no cumple el esquema Zod esperado', async () => {
      const esquemaIncompatible = z.object({
        campoInexistenteObligatorio: z.string(),
      });

      await expect(
        clienteHttp.get('/estaciones', { schema: esquemaIncompatible }),
      ).rejects.toThrow(ErrorApi);

      try {
        await clienteHttp.get('/estaciones', { schema: esquemaIncompatible });
      } catch (err) {
        const errorApi = err as ErrorApi;
        expect(errorApi.codigo).toBe('ERROR_VALIDACION_RESPUESTA');
        expect(errorApi.campos).toBeDefined();
      }
    });

    it('serializa parámetros de consulta correctamente omitiendo valores nulos o indefinidos', async () => {
      const operadores = await obtenerOperadores({
        rol: 'RECAUDADOR',
        estado: undefined,
        q: 'Carlos',
      });

      expect(Array.isArray(operadores)).toBe(true);
      expect(operadores.length).toBeGreaterThan(0);
      expect(operadores[0].nombres).toContain('Carlos');
    });
  });

  describe('Recursos API y funciones de llamada', () => {
    it('login autentica credenciales válidas y retorna usuario con turno abierto', async () => {
      const respuesta = await login({
        codigo: 'EMP-001',
        clave: 'Turno123*',
      });

      expect(respuesta.usuario.codigo).toBe('EMP-001');
      expect(respuesta.usuario.rol).toBe('RECAUDADOR');
      expect(respuesta.turno_abierto).toBeDefined();
      expect(respuesta.turno_abierto?.id_turno).toBe(8);
      expect(respuesta.turno_abierto?.estacion_nombre).toBe('Estación Gambote');
    });

    it('obtenerEstaciones y obtenerCasetas retornan los datos del DML', async () => {
      const estaciones = await obtenerEstaciones();
      expect(estaciones.length).toBeGreaterThanOrEqual(2);

      const casetasEstacion1 = await obtenerCasetas(1);
      expect(casetasEstacion1.length).toBeGreaterThan(0);
      expect(casetasEstacion1.every((c) => c.id_estacion === 1)).toBe(true);
    });

    it('operadores permite listar, obtener por id, crear y actualizar', async () => {
      const lista = await obtenerOperadores();
      expect(lista.length).toBeGreaterThan(0);

      const op1 = await obtenerOperador(1);
      expect(op1.id_operador).toBe(1);
      expect(op1.codigo_empleado).toBe('EMP-001');

      const nuevoOp = await crearOperador({
        numero_documento: '1099887766',
        nombres: 'Prueba',
        apellidos: 'Operador',
        codigo_empleado: 'OP-TEST',
        rol: 'RECAUDADOR',
        estado: 'ACTIVO',
      });
      expect(nuevoOp.id_operador).toBeGreaterThan(0);
      expect(nuevoOp.codigo_empleado).toBe('OP-TEST');

      const actualizado = await actualizarOperador({
        id: nuevoOp.id_operador,
        datos: { estado: 'INACTIVO' },
      });
      expect(actualizado.estado).toBe('INACTIVO');
    });

    it('categorias permite listar, crear y actualizar', async () => {
      const categorias = await obtenerCategorias();
      expect(categorias.length).toBeGreaterThanOrEqual(5);

      const nuevaCat = await crearCategoria({
        codigo: 'CAT-TEST',
        descripcion: 'Categoría de prueba para test',
        numero_ejes_min: 2,
        numero_ejes_max: 3,
        peso_maximo_ton: 5.5,
        activo: true,
      });
      expect(nuevaCat.id_categoria).toBeGreaterThan(0);
      expect(nuevaCat.codigo).toBe('CAT-TEST');

      const catActualizada = await actualizarCategoria({
        id: nuevaCat.id_categoria,
        datos: { descripcion: 'Descripción modificada' },
      });
      expect(catActualizada.descripcion).toBe('Descripción modificada');
    });

    it('tarifas permite listar con filtros, crear y actualizar', async () => {
      const tarifas = await obtenerTarifas({ vigente: true });
      expect(tarifas.length).toBeGreaterThan(0);
      expect(tarifas.every((t) => t.activa)).toBe(true);

      const nuevaTarifa = await crearTarifa({
        id_estacion: 1,
        id_categoria: 1,
        monto: 15500,
        resolucion_legal: 'RES-TEST-2026',
        fecha_inicio_vigencia: '2026-01-01',
        fecha_fin_vigencia: null,
        activa: true,
      });
      expect(nuevaTarifa.id_tarifa).toBeGreaterThan(0);
      expect(nuevaTarifa.monto).toBe(15500);

      const tarifaActualizada = await actualizarTarifa({
        id: nuevaTarifa.id_tarifa,
        datos: { activa: false },
      });
      expect(tarifaActualizada.activa).toBe(false);
    });

    it('vehiculos y telepeaje consultan datos reales del DML', async () => {
      const detalle = await obtenerVehiculo('HKL123');
      expect(detalle.vehiculo.placa).toBe('HKL123');
      expect(detalle.vehiculo.id_categoria).toBe(1);
      expect(detalle.cuenta?.tag_rfid_serial).toBe('TAG-COL-9900112233');

      const cuentas = await obtenerCuentasTelepeaje();
      expect(cuentas.length).toBeGreaterThan(0);

      const cuentaPlaca = await obtenerCuentaPorPlaca('HKL123');
      expect(cuentaPlaca.placa_vehiculo).toBe('HKL123');
      expect(cuentaPlaca.saldo_disponible).toBeGreaterThanOrEqual(0);
    });

    it('turnos permite listar, consultar detalle, consultar transacciones y cerrar turno con cálculo de descuadre', async () => {
      const turnos = await obtenerTurnos();
      expect(turnos.length).toBeGreaterThan(0);

      const turno8 = await obtenerTurno(8);
      expect(turno8.id_turno).toBe(8);
      expect(turno8.estado).toBe('ABIERTO');

      const transaccionesTurno8 = await obtenerTransaccionesTurno(8);
      expect(Array.isArray(transaccionesTurno8)).toBe(true);

      // Cierre del turno 9: declara 10000 frente a 10500 de recaudo -> descuadre -500
      const turno9Cerrado = await cerrarTurno({
        idTurno: 9,
        total_declarado_cierre: 10000,
      });
      expect(turno9Cerrado.estado).toBe('CERRADO');
      expect(turno9Cerrado.total_declarado_cierre).toBe(10000);
      expect(turno9Cerrado.diferencia_descuadre).toBe(-500);
    });

    it('transacciones registra cobro en efectivo y calcula cambio', async () => {
      const res = await registrarTransaccion({
        id_turno: 8,
        id_tarifa: 1,
        id_categoria: 1,
        placa_detectada: 'XYZ789',
        monto_tarifa: 10500,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'TK-TEST-EF',
        estado_paso: 'APROBADO',
        recibido: 20000,
      });

      expect(res.transaccion.id_transaccion).toBeGreaterThan(0);
      expect(res.transaccion.metodo_pago).toBe('EFECTIVO');
      expect(res.cambio).toBe(9500);
    });

    it('transacciones anula transacción y genera registro inmutable en auditoría', async () => {
      const txs = await obtenerTransaccionesTurno(8);
      expect(txs.length).toBeGreaterThan(0);
      const idTx = txs[0].id_transaccion;

      const resAnulacion = await anularTransaccion({
        idTransaccion: idTx,
        motivo: 'Error de digitación en prueba',
        usuario_sistema: 'SUPERVISOR-TEST',
      });

      expect(resAnulacion.transaccion.id_transaccion).toBe(idTx);
      expect(resAnulacion.auditoria.tipo_operacion).toBe('VOID');
      expect(resAnulacion.auditoria.motivo).toBe('Error de digitación en prueba');

      const auditoria = await obtenerAuditoria();
      const evento = auditoria.find((a) => a.id_transaccion === idTx && a.tipo_operacion === 'VOID');
      expect(evento).toBeDefined();
    });

    it('recaudo calcula totales por día y por carril', async () => {
      const recaudo = await obtenerRecaudo();
      expect(recaudo.total_general).toBeGreaterThan(0);
      expect(recaudo.total_efectivo).toBeGreaterThanOrEqual(0);
      expect(recaudo.total_telepeaje).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(recaudo.dias)).toBe(true);
      expect(Array.isArray(recaudo.carriles)).toBe(true);
    });
  });

  describe('Hooks de TanStack Query', () => {
    it('useEstaciones carga la lista de estaciones exitosamente', async () => {
      const { wrapper } = crearWrapperQuery();
      const { result } = renderHook(() => useEstaciones(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.length).toBeGreaterThanOrEqual(2);
    });

    it('useLogin muta el estado, guarda el usuario en caché e invalida claves de turnos', async () => {
      const { queryClient, wrapper } = crearWrapperQuery();
      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({
        codigo: 'EMP-001',
        clave: 'Turno123*',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.usuario.codigo).toBe('EMP-001');

      // Verificar que el usuario quedó guardado en la caché de React Query
      const usuarioEnCache = queryClient.getQueryData(['auth', 'usuario']);
      expect(usuarioEnCache).toEqual(result.current.data?.usuario);
    });

    it('useRegistrarTransaccion registra y gatilla la invalidación de turnos y recaudo', async () => {
      const { queryClient, wrapper } = crearWrapperQuery();
      const spyInvalidate = vitest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRegistrarTransaccion(), { wrapper });

      result.current.mutate({
        id_turno: 10,
        id_tarifa: 2,
        id_categoria: 2,
        placa_detectada: 'XYZ789',
        monto_tarifa: 16000,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'TK-HOOK-01',
        estado_paso: 'APROBADO',
        recibido: 20000,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.cambio).toBe(4000);

      // Verificamos que se invalidaron las consultas clave
      expect(spyInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['turnos'] }),
      );
      expect(spyInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['recaudo'] }),
      );
      expect(spyInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['auditoria'] }),
      );
    });

    it('useCerrarTurno muta, actualiza el detalle en caché e invalida recaudo', async () => {
      const { queryClient, wrapper } = crearWrapperQuery();
      const spyInvalidate = vitest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCerrarTurno(), { wrapper });

      result.current.mutate({
        idTurno: 10,
        total_declarado_cierre: 16000,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.estado).toBe('CERRADO');

      expect(spyInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['turnos'] }),
      );
      expect(spyInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['recaudo'] }),
      );
    });
  });
});
