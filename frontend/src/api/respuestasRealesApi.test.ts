import { describe, expect, it } from 'vitest';
import { esquemaCategoriaVehiculo, esquemaTarifa, esquemaTurno } from '@/types';
import { esquemaRespuestaRegistroTransaccion } from './recursos/transacciones';

/**
 * La API serializa con JsonIgnoreCondition.WhenWritingNull: las propiedades
 * nulas no aparecen en el JSON. Estos literales son respuestas reales de la API.
 */
describe('respuestas reales de la API (claves nulas ausentes)', () => {
  it('turno ABIERTO sin total_declarado_cierre ni diferencia_descuadre', () => {
    const real = {
      id_turno: 13,
      id_caseta: 4,
      id_operador: 1,
      fecha: '2026-11-21',
      diurno: true,
      fondo_inicial_caja: 50000.0,
      total_recaudado_efectivo: 10500.0,
      estado: 'ABIERTO',
    };
    expect(esquemaTurno.safeParse(real).success).toBe(true);
    expect(esquemaTurno.array().safeParse([real, real]).success).toBe(true);
  });

  it('cobro en EFECTIVO sin saldo_posterior', () => {
    const real = {
      id_transaccion: 26,
      numero_ticket: 'TCK-20261121-01010',
      placa: 'HKL123',
      placa_detectada: 'HKL123',
      id_categoria: 1,
      monto_tarifa: 10500.0,
      metodo_pago: 'EFECTIVO',
      efectivo_recibido: 20000,
      cambio: 9500.0,
      estado_paso: 'APROBADO',
      fecha_hora: '2026-11-21T19:42:20.8226552Z',
      transaccion: {
        id_transaccion: 26,
        id_turno: 13,
        id_tarifa: 1,
        id_categoria: 1,
        placa_detectada: 'HKL123',
        monto_tarifa: 10500.0,
        metodo_pago: 'EFECTIVO',
        numero_ticket: 'TCK-20261121-01010',
        fecha_hora: '2026-11-21T19:42:20.8226552Z',
        estado_paso: 'APROBADO',
      },
    };
    expect(esquemaRespuestaRegistroTransaccion.safeParse(real).success).toBe(true);
  });

  it('cobro con TELEPEAJE sin cambio y con detalle_telepeaje sin ids', () => {
    const real = {
      id_transaccion: 27,
      numero_ticket: 'TCK-20261121-01020',
      placa: 'KJN456',
      placa_detectada: 'KJN456',
      id_categoria: 2,
      monto_tarifa: 12800.0,
      metodo_pago: 'TELEPEAJE',
      saldo_posterior: 287200.0,
      estado_paso: 'APROBADO',
      fecha_hora: '2026-11-21T19:42:21.069273Z',
      transaccion: {
        id_transaccion: 27,
        id_turno: 13,
        id_tarifa: 2,
        id_categoria: 2,
        placa_detectada: 'KJN456',
        monto_tarifa: 12800.0,
        metodo_pago: 'TELEPEAJE',
        numero_ticket: 'TCK-20261121-01020',
        fecha_hora: '2026-11-21T19:42:21.069273Z',
        estado_paso: 'APROBADO',
      },
      detalle_telepeaje: {
        id_cuenta: 3,
        saldo_anterior: 300000.0,
        saldo_posterior: 287200.0,
        antena_lectora_id: 'ANTENA-01',
      },
    };
    expect(esquemaRespuestaRegistroTransaccion.safeParse(real).success).toBe(true);
  });

  it('tarifa sin fecha_fin_vigencia (fecha_inicio_vigencia ya en YYYY-MM-DD)', () => {
    const real = {
      id_tarifa: 1,
      id_estacion: 1,
      estacion_nombre: 'Estación Gambote',
      id_categoria: 1,
      categoria_codigo: 'CAT_I',
      monto: 10500.0,
      resolucion_legal: 'Res. MinTransporte 0045/2026',
      fecha_inicio_vigencia: '2026-01-01',
      activa: true,
    };
    expect(esquemaTarifa.safeParse(real).success).toBe(true);
  });

  it('categoria sin peso_maximo_ton', () => {
    const real = {
      id_categoria: 8,
      codigo: 'P5A',
      descripcion: 'Prueba P5a',
      numero_ejes_min: 2,
      numero_ejes_max: 3,
      activo: true,
    };
    expect(esquemaCategoriaVehiculo.safeParse(real).success).toBe(true);
  });
});
