import { describe, expect, it } from 'vitest';
import {
  calcularCambio,
  calcularDiferenciaArqueo,
  conciliarTurnoPasos,
  determinarCondicionCuenta,
  diagnosticarArqueo,
  esPlacaCompleta,
  evaluarSaldoTelepeaje,
  generarHistorialTarifa,
  normalizarPlaca,
  obtenerAyudaPlaca,
  validarPlaca,
  validarTarifa,
} from './index';

describe('Funciones de Dominio Compartidas (portadas de prototipos Claude Design)', () => {
  describe('Placa (Operador.dc.html:276, 283-288, 403)', () => {
    it('normalizarPlaca: convierte a mayúsculas, elimina caracteres especiales y trunca a 6', () => {
      expect(normalizarPlaca('hkl-123')).toBe('HKL123');
      expect(normalizarPlaca(' hkl 123! ')).toBe('HKL123');
      expect(normalizarPlaca('hkl123456')).toBe('HKL123');
      expect(normalizarPlaca('')).toBe('');
    });

    it('esPlacaCompleta: valida formato exacto 3 letras y 3 números', () => {
      expect(esPlacaCompleta('HKL123')).toBe(true);
      expect(esPlacaCompleta('ZXC987')).toBe(true);
      expect(esPlacaCompleta('HK1234')).toBe(false);
      expect(esPlacaCompleta('HKL12')).toBe(false);
      expect(esPlacaCompleta('123HKL')).toBe(false);
      expect(esPlacaCompleta('HKL12A')).toBe(false);
    });

    it('validarPlaca: mensajes exactos del prototipo Operador.dc.html:306-308', () => {
      expect(validarPlaca('')).toEqual({
        valida: false,
        error: 'Escribe la placa del vehículo.',
      });
      expect(validarPlaca('HKL12')).toEqual({
        valida: false,
        error: 'La placa debe tener tres letras y tres números.',
      });
      expect(validarPlaca('HK1234')).toEqual({
        valida: false,
        error: 'Formato no válido: deben ser tres letras y tres números.',
      });
      expect(validarPlaca('HKL123')).toEqual({
        valida: true,
      });
    });

    it('obtenerAyudaPlaca: mensajes contextuales exactos de Operador.dc.html:283-288', () => {
      // Estado inicial vacío
      expect(obtenerAyudaPlaca('')).toEqual({
        texto: 'Tres letras y tres números. Si el vehículo está registrado, la categoría se elige sola.',
        tipo: 'neutro',
      });

      // 6 caracteres pero formato inválido
      expect(obtenerAyudaPlaca('ABCDEF')).toEqual({
        texto: 'Formato no válido: deben ser tres letras y tres números.',
        tipo: 'error',
      });

      // Placa completa registrada
      expect(
        obtenerAyudaPlaca('HKL123', {
          categoriaRomano: 'I',
          estadoCuenta: 'ACTIVA',
        }),
      ).toEqual({
        texto: 'Vehículo registrado · categoría I · TAG ACTIVA',
        tipo: 'exito',
      });

      // Placa completa NO registrada
      expect(obtenerAyudaPlaca('XYZ999', null)).toEqual({
        texto: 'Vehículo no registrado: elige la categoría por sus ejes.',
        tipo: 'neutro',
      });
    });
  });

  describe('Cálculo de cambio y efectivo (Operador.dc.html:291-294, 338-344)', () => {
    it('detecta valor no ingresado o menor a cero', () => {
      const res = calcularCambio(0, 10500);
      expect(res.esSuficiente).toBe(false);
      expect(res.cambio).toBe(0);
      expect(res.faltante).toBe(10500);
      expect(res.mensaje).toBe('Ingresa el valor recibido.');
    });

    it('detecta dinero insuficiente e indica faltante formateado', () => {
      const res = calcularCambio(10000, 10500);
      expect(res.esSuficiente).toBe(false);
      expect(res.cambio).toBe(0);
      expect(res.faltante).toBe(500);
      expect(res.mensaje).toBe('Faltan $ 500 para cubrir el peaje.');
    });

    it('calcula pago exacto con cambio 0', () => {
      const res = calcularCambio(10500, 10500);
      expect(res.esSuficiente).toBe(true);
      expect(res.cambio).toBe(0);
      expect(res.faltante).toBe(0);
      expect(res.mensaje).toBeNull();
    });

    it('calcula cambio correcto con billete grande ($ 50.000 para peaje $ 10.500 -> cambio $ 39.500)', () => {
      const res = calcularCambio(50000, 10500);
      expect(res.esSuficiente).toBe(true);
      expect(res.cambio).toBe(39500);
      expect(res.faltante).toBe(0);
      expect(res.mensaje).toBeNull();
    });

    it('calcula cambio con billete de $ 100.000 para tarifa Cat VII ($ 48.500 -> cambio $ 51.500)', () => {
      const res = calcularCambio(100000, 48500);
      expect(res.esSuficiente).toBe(true);
      expect(res.cambio).toBe(51500);
      expect(res.faltante).toBe(0);
    });
  });

  describe('Telepeaje y saldos (Operador.dc.html:295-300, Supervisor.dc.html:288-297)', () => {
    it('evaluarSaldoTelepeaje: rechaza si el vehículo no tiene cuenta registrada', () => {
      const res = evaluarSaldoTelepeaje(null, 10500);
      expect(res.puedeDebitar).toBe(false);
      expect(res.saldoPosterior).toBe(0);
      expect(res.mensaje).toBe('La placa no tiene cuenta de telepeaje registrada.');
    });

    it('evaluarSaldoTelepeaje: rechaza cuenta suspendida (caso ZXC987)', () => {
      const res = evaluarSaldoTelepeaje(
        {
          tag: 'TAG-COL-9900112238',
          saldo: 0,
          estado: 'SUSPENDIDA',
        },
        31500,
      );
      expect(res.puedeDebitar).toBe(false);
      expect(res.saldoPosterior).toBe(0);
      expect(res.mensaje).toBe('La cuenta TAG-COL-9900112238 está SUSPENDIDA: cobra en efectivo.');
    });

    it('evaluarSaldoTelepeaje: rechaza saldo insuficiente (caso QWE321: saldo $ 8.000 < tarifa $ 15.300)', () => {
      const res = evaluarSaldoTelepeaje(
        {
          tag: 'TAG-COL-9900112236',
          saldo: 8000,
          estado: 'ACTIVA',
        },
        15300,
      );
      expect(res.puedeDebitar).toBe(false);
      expect(res.saldoPosterior).toBe(8000);
      expect(res.mensaje).toBe('Saldo insuficiente: la cuenta tiene $ 8.000 y el peaje cuesta $ 15.300.');
    });

    it('evaluarSaldoTelepeaje: aprueba saldo suficiente y calcula saldo posterior (caso HKL123: $ 150.000 - $ 10.500 = $ 139.500)', () => {
      const res = evaluarSaldoTelepeaje(
        {
          tag: 'TAG-COL-9900112233',
          saldo: 150000,
          estado: 'ACTIVA',
        },
        10500,
      );
      expect(res.puedeDebitar).toBe(true);
      expect(res.saldoPosterior).toBe(139500);
      expect(res.mensaje).toBeNull();
    });

    it('determinarCondicionCuenta: clasifica SIN SALDO, SALDO CRÍTICO y SALDO SUFICIENTE', () => {
      expect(determinarCondicionCuenta(0, 'ACTIVA')).toBe('SIN SALDO');
      expect(determinarCondicionCuenta(50000, 'SUSPENDIDA')).toBe('SIN SALDO');
      expect(determinarCondicionCuenta(8000, 'ACTIVA')).toBe('SALDO CRÍTICO');
      expect(determinarCondicionCuenta(10000, 'ACTIVA')).toBe('SALDO SUFICIENTE');
      expect(determinarCondicionCuenta(150000, 'ACTIVA')).toBe('SALDO SUFICIENTE');
    });
  });

  describe('Diagnóstico de arqueo y cierre (Operador.dc.html:364-374, Supervisor.dc.html:327-333)', () => {
    it('calcularDiferenciaArqueo: declarado menos recaudado', () => {
      expect(calcularDiferenciaArqueo(315000, 315000)).toBe(0);
      expect(calcularDiferenciaArqueo(248000, 250000)).toBe(-2000);
      expect(calcularDiferenciaArqueo(425000, 420000)).toBe(5000);
    });

    it('diagnosticarArqueo: turno abierto (declarado null) -> EN PROCESO', () => {
      const res = diagnosticarArqueo(null, 10500);
      expect(res.diagnostico).toBeNull();
      expect(res.diferencia).toBeNull();
      expect(res.texto).toBe('EN PROCESO');
    });

    it('diagnosticarArqueo: CUADRADO cuando declarado === recaudado', () => {
      const res = diagnosticarArqueo(315000, 315000);
      expect(res.diagnostico).toBe('CUADRADO');
      expect(res.diferencia).toBe(0);
      expect(res.texto).toBe('CUADRADO');
    });

    it('diagnosticarArqueo: FALTANTE cuando declarado < recaudado (caso del turno 2: 248.000 vs 250.000 -> dif -2.000)', () => {
      const res = diagnosticarArqueo(248000, 250000);
      expect(res.diagnostico).toBe('FALTANTE');
      expect(res.diferencia).toBe(-2000);
      expect(res.texto).toContain('FALTANTE');
    });

    it('diagnosticarArqueo: caso manual solicitado en TAREA-PEAJESYS-B1a (declarar $ 10.000 frente a $ 10.500 recaudados -> dif -500 FALTANTE)', () => {
      const res = diagnosticarArqueo(10000, 10500);
      expect(res.diagnostico).toBe('FALTANTE');
      expect(res.diferencia).toBe(-500);
      expect(res.texto).toContain('FALTANTE');
    });

    it('diagnosticarArqueo: SOBRANTE cuando declarado > recaudado (caso del turno 5: 425.000 vs 420.000 -> dif +5.000)', () => {
      const res = diagnosticarArqueo(425000, 420000);
      expect(res.diagnostico).toBe('SOBRANTE');
      expect(res.diferencia).toBe(5000);
      expect(res.texto).toContain('SOBRANTE');
    });
  });

  describe('Conciliación turno vs pasos (Supervisor.dc.html:334-340)', () => {
    it('concilia cuando el recaudo en efectivo del turno es idéntico a la suma de sus transacciones en efectivo', () => {
      const res = conciliarTurnoPasos(52500, 52500);
      expect(res.concilia).toBe(true);
      expect(res.diferencia).toBe(0);
      expect(res.mensaje).toBe('Concilia');
    });

    it('detecta no conciliación e informa el monto sin pasos (caso turno 1: 315.000 vs 32.500 -> 282.500 sin pasos)', () => {
      const res = conciliarTurnoPasos(315000, 32500);
      expect(res.concilia).toBe(false);
      expect(res.diferencia).toBe(282500);
      expect(res.mensaje).toBe('No concilia: $ 282.500 sin pasos');
    });
  });

  describe('Validaciones de tarifa e historial (Admin.dc.html:370-385)', () => {
    it('validarTarifa: rechaza monto <= 0', () => {
      const res = validarTarifa({
        monto: 0,
        resolucion_legal: 'Res. 0045/2026',
        fecha_inicio_vigencia: '2026-01-01',
      });
      expect(res.valida).toBe(false);
      expect(res.campo).toBe('monto');
      expect(res.error).toBe('El monto debe ser mayor que 0.');
    });

    it('validarTarifa: rechaza resolución vacía', () => {
      const res = validarTarifa({
        monto: 12000,
        resolucion_legal: '   ',
        fecha_inicio_vigencia: '2026-01-01',
      });
      expect(res.valida).toBe(false);
      expect(res.campo).toBe('resolucion_legal');
      expect(res.error).toBe('Indica la resolución que autoriza la tarifa.');
    });

    it('validarTarifa: rechaza fecha de inicio faltante', () => {
      const res = validarTarifa({
        monto: 12000,
        resolucion_legal: 'Res. 0045/2026',
        fecha_inicio_vigencia: '',
      });
      expect(res.valida).toBe(false);
      expect(res.campo).toBe('fecha_inicio_vigencia');
      expect(res.error).toBe('Indica desde qué fecha rige.');
    });

    it('validarTarifa: rechaza fecha de fin anterior a inicio', () => {
      const res = validarTarifa({
        monto: 12000,
        resolucion_legal: 'Res. 0045/2026',
        fecha_inicio_vigencia: '2026-01-01',
        fecha_fin_vigencia: '2025-12-31',
      });
      expect(res.valida).toBe(false);
      expect(res.campo).toBe('fecha_fin_vigencia');
      expect(res.error).toBe('La fecha de fin debe ser posterior o igual a la de inicio.');
    });

    it('validarTarifa: acepta tarifa válida', () => {
      const res = validarTarifa({
        monto: 12000,
        resolucion_legal: 'Res. 0045/2026',
        fecha_inicio_vigencia: '2026-01-01',
        fecha_fin_vigencia: '2026-12-31',
      });
      expect(res.valida).toBe(true);
    });

    it('generarHistorialTarifa: genera entrada de auditoría para historial de Admin.dc.html:377-381', () => {
      const entrada = generarHistorialTarifa(
        { monto: 10500 },
        { monto: 11000, resolucion: 'Res. 0050/2026', admin: 'ADMIN-01' },
        'Gambote',
        'I',
      );
      expect(entrada.titulo).toBe('Gambote · categoría I');
      expect(entrada.cambio).toBe('$ 10.500 -> $ 11.000');
      expect(entrada.meta).toContain('ADMIN-01 · Res. 0050/2026');
    });

    it('generarHistorialTarifa: registra correctamente una tarifa inicial sin tarifa anterior', () => {
      const entrada = generarHistorialTarifa(
        null,
        { monto: 10500, resolucion: 'Res. 0045/2026', admin: 'ADMIN-01' },
        'La Ceballos',
        'IV',
      );
      expect(entrada.titulo).toBe('La Ceballos · categoría IV');
      expect(entrada.cambio).toBe('Sin tarifa -> $ 10.500');
    });
  });
});
