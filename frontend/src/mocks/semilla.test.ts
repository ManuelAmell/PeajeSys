import { describe, expect, it } from 'vitest';
import {
  esquemaAuditoriaTransaccion,
  esquemaCaseta,
  esquemaCategoriaVehiculo,
  esquemaCuentaTelepeaje,
  esquemaDetallePagoTelepeaje,
  esquemaEstacionPeaje,
  esquemaOperador,
  esquemaTarifa,
  esquemaTransaccionPeaje,
  esquemaTurno,
  esquemaVehiculo,
} from '@/types';
import contenidoDml from '../../../database/02_SQL/02_DML_Datos_PeajeSys.sql?raw';
import contenidoGenerado from './semilla.ts?raw';
// El generador es un script Node en .mjs sin declaraciones de tipos; TypeScript
// no resuelve .mjs cuando allowJs esta desactivado. Su salida se verifica aqui.
// @ts-expect-error script Node sin tipos
import { generarContenido } from '../../scripts/generar-semilla.mjs';
import { SEMILLA } from './semilla';

const PRIMERA_LINEA_ESPERADA =
  '// GENERADO por scripts/generar-semilla.mjs desde database/02_DML_Datos_PeajeSys.sql. No editar a mano.';

function conjunto<T, K extends keyof T>(filas: T[], campo: K): Set<T[K]> {
  return new Set(filas.map((fila) => fila[campo]));
}

function verificarEsquema<T>(
  nombre: string,
  filas: T[],
  esquema: {
    safeParse: (valor: unknown) => {
      success: boolean;
      error?: { message: string };
    };
  },
): void {
  filas.forEach((fila, indice) => {
    const resultado = esquema.safeParse(fila);
    expect(
      resultado.success,
      `${nombre}[${indice}]: ${resultado.error?.message ?? ''}`,
    ).toBe(true);
  });
}

describe('SEMILLA generada desde el DML', () => {
  it('tiene el recuento de filas del DML mas las del CASO 1 con COMMIT', () => {
    expect(SEMILLA.estaciones).toHaveLength(2);
    expect(SEMILLA.casetas).toHaveLength(6);
    expect(SEMILLA.operadores).toHaveLength(14);
    expect(SEMILLA.categorias).toHaveLength(7);
    expect(SEMILLA.tarifas).toHaveLength(10);
    expect(SEMILLA.vehiculos).toHaveLength(10);
    expect(SEMILLA.cuentas_telepeaje).toHaveLength(10);
    expect(SEMILLA.turnos).toHaveLength(10);
    expect(SEMILLA.transacciones).toHaveLength(19);
    expect(SEMILLA.detalles_telepeaje).toHaveLength(10);
    expect(SEMILLA.auditorias).toHaveLength(13);
  });

  it('cada fila cumple el esquema Zod de B1a', () => {
    verificarEsquema('estaciones', SEMILLA.estaciones, esquemaEstacionPeaje);
    verificarEsquema('casetas', SEMILLA.casetas, esquemaCaseta);
    verificarEsquema('operadores', SEMILLA.operadores, esquemaOperador);
    verificarEsquema(
      'categorias',
      SEMILLA.categorias,
      esquemaCategoriaVehiculo,
    );
    verificarEsquema('tarifas', SEMILLA.tarifas, esquemaTarifa);
    verificarEsquema('vehiculos', SEMILLA.vehiculos, esquemaVehiculo);
    verificarEsquema(
      'cuentas_telepeaje',
      SEMILLA.cuentas_telepeaje,
      esquemaCuentaTelepeaje,
    );
    verificarEsquema('turnos', SEMILLA.turnos, esquemaTurno);
    verificarEsquema(
      'transacciones',
      SEMILLA.transacciones,
      esquemaTransaccionPeaje,
    );
    verificarEsquema(
      'detalles_telepeaje',
      SEMILLA.detalles_telepeaje,
      esquemaDetallePagoTelepeaje,
    );
    verificarEsquema(
      'auditorias',
      SEMILLA.auditorias,
      esquemaAuditoriaTransaccion,
    );
  });

  it('todas las llaves foraneas apuntan a filas existentes', () => {
    const idEstacion = conjunto(SEMILLA.estaciones, 'id_estacion');
    const idCaseta = conjunto(SEMILLA.casetas, 'id_caseta');
    const idOperador = conjunto(SEMILLA.operadores, 'id_operador');
    const idCategoria = conjunto(SEMILLA.categorias, 'id_categoria');
    const idTarifa = conjunto(SEMILLA.tarifas, 'id_tarifa');
    const placa = conjunto(SEMILLA.vehiculos, 'placa');
    const idCuenta = conjunto(SEMILLA.cuentas_telepeaje, 'id_cuenta');
    const idTurno = conjunto(SEMILLA.turnos, 'id_turno');
    const idTransaccion = conjunto(SEMILLA.transacciones, 'id_transaccion');

    for (const caseta of SEMILLA.casetas) {
      expect(idEstacion.has(caseta.id_estacion)).toBe(true);
    }
    for (const tarifa of SEMILLA.tarifas) {
      expect(idEstacion.has(tarifa.id_estacion)).toBe(true);
      expect(idCategoria.has(tarifa.id_categoria)).toBe(true);
    }
    for (const vehiculo of SEMILLA.vehiculos) {
      expect(idCategoria.has(vehiculo.id_categoria)).toBe(true);
    }
    for (const cuenta of SEMILLA.cuentas_telepeaje) {
      expect(placa.has(cuenta.placa_vehiculo)).toBe(true);
    }
    for (const turno of SEMILLA.turnos) {
      expect(idCaseta.has(turno.id_caseta)).toBe(true);
      expect(idOperador.has(turno.id_operador)).toBe(true);
    }
    for (const transaccion of SEMILLA.transacciones) {
      expect(idTurno.has(transaccion.id_turno)).toBe(true);
      expect(idTarifa.has(transaccion.id_tarifa)).toBe(true);
      expect(idCategoria.has(transaccion.id_categoria)).toBe(true);
    }
    for (const detalle of SEMILLA.detalles_telepeaje) {
      expect(idTransaccion.has(detalle.id_transaccion)).toBe(true);
      expect(idCuenta.has(detalle.id_cuenta)).toBe(true);
    }
    for (const auditoria of SEMILLA.auditorias) {
      expect(idTransaccion.has(auditoria.id_transaccion)).toBe(true);
    }
  });

  const descuadresDelDml: Array<{
    turno: number;
    recaudado: number;
    efectivo: number;
  }> = [
    { turno: 1, recaudado: 315000, efectivo: 32500 },
    { turno: 2, recaudado: 250000, efectivo: 10500 },
    { turno: 3, recaudado: 0, efectivo: 0 },
    { turno: 4, recaudado: 180000, efectivo: 42000 },
    { turno: 5, recaudado: 420000, efectivo: 48500 },
    { turno: 6, recaudado: 190000, efectivo: 0 },
    { turno: 7, recaudado: 0, efectivo: 0 },
    { turno: 8, recaudado: 52500, efectivo: 52500 },
    { turno: 9, recaudado: 10500, efectivo: 10500 },
    { turno: 10, recaudado: 0, efectivo: 0 },
  ];

  it.each(descuadresDelDml)(
    'el turno $turno conserva el descuadre real del DML ($recaudado frente a $efectivo)',
    ({ turno, recaudado, efectivo }) => {
      const encontrado = SEMILLA.turnos.find((fila) => fila.id_turno === turno);
      expect(encontrado).toBeDefined();
      expect(encontrado?.total_recaudado_efectivo).toBe(recaudado);

      const sumaEfectivo = SEMILLA.transacciones
        .filter(
          (fila) => fila.id_turno === turno && fila.metodo_pago === 'EFECTIVO',
        )
        .reduce((acumulado, fila) => acumulado + fila.monto_tarifa, 0);
      expect(sumaEfectivo).toBe(efectivo);
    },
  );

  it('QWE321 tiene saldo 8000, cuenta ACTIVA y la tarifa de su categoria', () => {
    const vehiculo = SEMILLA.vehiculos.find((fila) => fila.placa === 'QWE321');
    expect(vehiculo).toBeDefined();
    expect(vehiculo?.id_categoria).toBe(3);

    const cuenta = SEMILLA.cuentas_telepeaje.find(
      (fila) => fila.placa_vehiculo === 'QWE321',
    );
    expect(cuenta).toBeDefined();
    expect(cuenta?.saldo_disponible).toBe(8000);
    expect(cuenta?.estado_cuenta).toBe('ACTIVA');

    const tarifa = SEMILLA.tarifas.find(
      (fila) =>
        fila.id_estacion === 1 &&
        fila.id_categoria === vehiculo?.id_categoria &&
        fila.activa,
    );
    expect(tarifa?.monto).toBe(15300);
    expect(cuenta?.saldo_disponible).toBeLessThan(tarifa?.monto ?? 0);
  });

  it('ZXC987 tiene saldo 0, cuenta SUSPENDIDA y la tarifa de su categoria', () => {
    const vehiculo = SEMILLA.vehiculos.find((fila) => fila.placa === 'ZXC987');
    expect(vehiculo).toBeDefined();
    expect(vehiculo?.id_categoria).toBe(5);

    const cuenta = SEMILLA.cuentas_telepeaje.find(
      (fila) => fila.placa_vehiculo === 'ZXC987',
    );
    expect(cuenta).toBeDefined();
    expect(cuenta?.saldo_disponible).toBe(0);
    expect(cuenta?.estado_cuenta).toBe('SUSPENDIDA');

    const tarifa = SEMILLA.tarifas.find(
      (fila) =>
        fila.id_estacion === 1 &&
        fila.id_categoria === vehiculo?.id_categoria &&
        fila.activa,
    );
    expect(tarifa?.monto).toBe(31500);
  });

  it('EMP-009 esta INACTIVO y no hay rol administrador en OPERADOR', () => {
    const emp009 = SEMILLA.operadores.find(
      (fila) => fila.codigo_empleado === 'EMP-009',
    );
    expect(emp009?.estado).toBe('INACTIVO');

    const administradores = SEMILLA.operadores.filter(
      (fila) => (fila.rol as string) === 'ADMIN',
    );
    expect(administradores).toHaveLength(0);
  });

  it('EMP-001 queda sin turno abierto: el turno 8 esta CERRADO', () => {
    const emp001 = SEMILLA.operadores.find(
      (fila) => fila.codigo_empleado === 'EMP-001',
    );
    expect(emp001).toBeDefined();

    const abiertos = SEMILLA.turnos.filter(
      (fila) =>
        fila.id_operador === emp001?.id_operador && fila.estado === 'ABIERTO',
    );
    expect(abiertos).toHaveLength(0);

    const turno8 = SEMILLA.turnos.find((fila) => fila.id_turno === 8);
    expect(turno8?.estado).toBe('CERRADO');
    expect(turno8?.total_recaudado_efectivo).toBe(52500);
    expect(turno8?.total_declarado_cierre).toBe(52500);
    expect(turno8?.diferencia_descuadre).toBe(0);
  });

  it('EMP-002 tiene el turno 9 y EMP-004 el turno 10 abiertos', () => {
    const emp002 = SEMILLA.operadores.find(
      (fila) => fila.codigo_empleado === 'EMP-002',
    );
    const emp004 = SEMILLA.operadores.find(
      (fila) => fila.codigo_empleado === 'EMP-004',
    );

    const turnosEmp002 = SEMILLA.turnos.filter(
      (fila) =>
        fila.id_operador === emp002?.id_operador && fila.estado === 'ABIERTO',
    );
    expect(turnosEmp002.map((fila) => fila.id_turno)).toEqual([9]);

    const turnosEmp004 = SEMILLA.turnos.filter(
      (fila) =>
        fila.id_operador === emp004?.id_operador && fila.estado === 'ABIERTO',
    );
    expect(turnosEmp004.map((fila) => fila.id_turno)).toEqual([10]);
  });

  it('aplica el CASO 1 (transaccion 19 y auditoria 13)', () => {
    const transaccion = SEMILLA.transacciones.find(
      (fila) => fila.id_transaccion === 19,
    );
    expect(transaccion).toMatchObject({
      id_turno: 8,
      id_tarifa: 1,
      id_categoria: 1,
      placa_detectada: 'UYT890',
      monto_tarifa: 10500,
      metodo_pago: 'EFECTIVO',
      numero_ticket: 'TCK-20261006-00019',
      fecha_hora: '2026-11-18T12:00:00-05:00',
      estado_paso: 'APROBADO',
    });

    const auditoria = SEMILLA.auditorias.find(
      (fila) => fila.id_auditoria === 13,
    );
    expect(auditoria).toMatchObject({
      id_transaccion: 19,
      tipo_operacion: 'INSERT',
      usuario_sistema: 'carlos_gomez',
      fecha_hora_evento: '2026-11-18T12:00:00-05:00',
      motivo: 'Cobro manual en efectivo exitoso',
    });
  });

  it('conserva las inconsistencias de estacion 2 y de la cuenta TAG 1', () => {
    const tarifasEstacion2 = SEMILLA.tarifas.filter(
      (fila) => fila.id_estacion === 2,
    );
    expect(tarifasEstacion2.map((fila) => fila.id_categoria)).toEqual([
      1, 2, 3,
    ]);

    const cuenta = SEMILLA.cuentas_telepeaje.find(
      (fila) => fila.id_cuenta === 1,
    );
    expect(cuenta?.saldo_disponible).toBe(150000);

    const detallesCuenta = SEMILLA.detalles_telepeaje.filter(
      (fila) => fila.id_cuenta === 1,
    );
    const ultimoDetalle = detallesCuenta.reduce((ultimo, fila) =>
      fila.id_detalle_telepeaje > ultimo.id_detalle_telepeaje ? fila : ultimo,
    );
    expect(ultimoDetalle.id_transaccion).toBe(12);
    expect(ultimoDetalle.saldo_posterior).toBe(139500);
    expect(cuenta?.saldo_disponible).not.toBe(ultimoDetalle.saldo_posterior);
  });

  it('no aplica los casos con ROLLBACK ni el DELETE con COMMIT (TMP111 y CAL999)', () => {
    const placas = SEMILLA.vehiculos.map((fila) => fila.placa);
    expect(placas).not.toContain('TMP111');
    expect(placas).not.toContain('CAL999');
    expect(placas).toHaveLength(10);
  });
});

describe('generador reproducible', () => {
  it('generar dos veces produce el mismo contenido que el archivo versionado', () => {
    const primera = generarContenido(contenidoDml);
    const segunda = generarContenido(contenidoDml);

    expect(segunda).toBe(primera);
    expect(contenidoGenerado).toBe(primera);
  });

  it('empieza con la linea de archivo generado', () => {
    const primeraLinea = contenidoGenerado.split('\n')[0];
    expect(primeraLinea).toBe(PRIMERA_LINEA_ESPERADA);
  });

  it('declara la lista de inconsistencias en la cabecera', () => {
    expect(contenidoGenerado).toContain(
      'Inconsistencias del DML que se conservan a proposito',
    );
    expect(contenidoGenerado).toContain(
      'turno 1 (315000 frente a 32500 en efectivo)',
    );
    expect(contenidoGenerado).toContain(
      'turno 5 (420000 frente a 48500 en efectivo)',
    );
    expect(contenidoGenerado).toContain(
      'Cuenta de telepeaje 1 (HKL123): saldo_disponible 150000',
    );
    expect(contenidoGenerado).toContain('Estación 2 (Estación La Ceballos)');
    expect(contenidoGenerado).not.toContain('password_hash');
  });
});

describe('usuarios del equipo en la semilla', () => {
  it('trae a los 4 usuarios con su rol y sin password_hash', () => {
    const equipo = SEMILLA.operadores
      .filter((fila) => /^(ADM|SUP|REC)-/.test(fila.codigo_empleado))
      .map((fila) => [fila.codigo_empleado, fila.rol]);
    expect(equipo).toEqual([
      ['ADM-001', 'ADMINISTRADOR'],
      ['SUP-001', 'SUPERVISOR'],
      ['REC-001', 'RECAUDADOR'],
      ['REC-002', 'RECAUDADOR'],
    ]);
    expect(JSON.stringify(SEMILLA.operadores)).not.toContain('password_hash');
    expect(JSON.stringify(SEMILLA.operadores)).not.toContain('$2');
  });
});
