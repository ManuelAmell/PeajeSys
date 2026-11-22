import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/api/clienteHttp';
import {
  actualizarOperador,
  crearOperador,
  obtenerOperador,
} from '@/api/recursos/operadores';

const base = {
  numero_documento: '1099000111',
  nombres: 'Ana',
  apellidos: 'Pérez',
  codigo_empleado: 'REC-010',
  rol: 'RECAUDADOR' as const,
  password: 'Clave-segura1',
};

describe('MSW /api/operadores imita a la API real', () => {
  it('crea con contraseña y nunca la devuelve', async () => {
    const creado = await crearOperador(base);
    expect(creado.codigo_empleado).toBe('REC-010');
    expect(JSON.stringify(creado)).not.toContain('Clave-segura1');
    expect(creado).not.toHaveProperty('password');
    expect(await obtenerOperador(creado.id_operador)).not.toHaveProperty(
      'password',
    );
  });

  it('exige la contraseña al crear (422)', async () => {
    const { password: _omitida, ...sinClave } = base;
    void _omitida;
    await expect(
      crearOperador(sinClave as unknown as typeof base),
    ).rejects.toMatchObject({ estado: 422 });
  });

  it('devuelve 409 OPERADOR_DUPLICADO por código o documento repetidos', async () => {
    await crearOperador(base);
    const porCodigo = crearOperador({ ...base, numero_documento: '5555' });
    await expect(porCodigo).rejects.toBeInstanceOf(ErrorApi);
    await expect(porCodigo).rejects.toMatchObject({
      estado: 409,
      codigo: 'OPERADOR_DUPLICADO',
    });
    await expect(
      crearOperador({ ...base, codigo_empleado: 'REC-011' }),
    ).rejects.toMatchObject({ estado: 409, codigo: 'OPERADOR_DUPLICADO' });
  });

  it('PATCH es parcial: cambia solo lo enviado, acepta ADMINISTRADOR y password sin devolverla', async () => {
    const creado = await crearOperador(base);
    const r = await actualizarOperador({
      id: creado.id_operador,
      datos: { rol: 'ADMINISTRADOR', password: 'Otra-clave-22' },
    });
    expect(r.rol).toBe('ADMINISTRADOR');
    expect(r.nombres).toBe('Ana');
    expect(r.numero_documento).toBe('1099000111');
    expect(JSON.stringify(r)).not.toContain('Otra-clave-22');
  });

  it('PATCH rechaza una contraseña vacía con 422', async () => {
    const creado = await crearOperador(base);
    await expect(
      actualizarOperador({ id: creado.id_operador, datos: { password: '' } }),
    ).rejects.toMatchObject({ estado: 422 });
  });
});
