import { describe, expect, it } from 'vitest';
import { esquemaFormularioTarifa } from './esquemaTarifaForm';

describe('Esquema del diálogo de tarifa', () => {
  const base = {
    monto: '11200',
    resolucion: 'Res. MinTransporte 0045/2026',
    desde: '2026-03-01',
    hasta: '',
  };

  it('acepta un formulario completo sin fecha de fin', () => {
    const resultado = esquemaFormularioTarifa.safeParse(base);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toEqual({
        monto: 11200,
        resolucion: 'Res. MinTransporte 0045/2026',
        desde: '2026-03-01',
        hasta: null,
      });
    }
  });

  it('acepta un formulario con fecha de fin coherente', () => {
    const resultado = esquemaFormularioTarifa.safeParse({
      ...base,
      hasta: '2026-12-31',
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza monto 0 con el mensaje del esquema Zod de tarifas', () => {
    const resultado = esquemaFormularioTarifa.safeParse({ ...base, monto: '0' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'El monto debe ser mayor que 0',
      );
      expect(resultado.error.issues[0]?.path).toEqual(['monto']);
    }
  });

  it('rechaza monto negativo o no numérico', () => {
    expect(esquemaFormularioTarifa.safeParse({ ...base, monto: '-5' }).success).toBe(
      false,
    );
    expect(
      esquemaFormularioTarifa.safeParse({ ...base, monto: 'abc' }).success,
    ).toBe(false);
  });

  it('rechaza resolución vacía con el mensaje del dominio (Admin.dc.html)', () => {
    const resultado = esquemaFormularioTarifa.safeParse({
      ...base,
      resolucion: '   ',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'Indica la resolución que autoriza la tarifa.',
      );
    }
  });

  it('rechaza resolución por encima del límite del DDL (100)', () => {
    const resultado = esquemaFormularioTarifa.safeParse({
      ...base,
      resolucion: 'R'.repeat(101),
    });
    expect(resultado.success).toBe(false);
  });

  it('rechaza fecha de inicio vacía', () => {
    const resultado = esquemaFormularioTarifa.safeParse({ ...base, desde: '' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'Indica desde qué fecha rige.',
      );
    }
  });

  it('rechaza fechas incoherentes: fin anterior al inicio (chk_fechas_vigencia)', () => {
    const resultado = esquemaFormularioTarifa.safeParse({
      ...base,
      hasta: '2026-02-28',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'La fecha de fin debe ser posterior o igual a la de inicio.',
      );
      expect(resultado.error.issues[0]?.path).toEqual(['hasta']);
    }
  });

  it('rechaza fechas con formato distinto a AAAA-MM-DD', () => {
    expect(
      esquemaFormularioTarifa.safeParse({ ...base, desde: '01/03/2026' }).success,
    ).toBe(false);
  });
});
