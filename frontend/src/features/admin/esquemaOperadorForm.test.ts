import { describe, expect, it } from 'vitest';
import {
  esquemaFormularioOperadorEdicion,
  esquemaFormularioOperadorNuevo,
  esquemaFormularioPassword,
} from './esquemaOperadorForm';

const valido = {
  documento: '1099000111',
  nombres: 'Ana María',
  apellidos: 'Pérez Ruiz',
  codigo: 'rec-010',
  rol: 'RECAUDADOR',
  password: 'Clave-segura1',
  confirmacion: 'Clave-segura1',
};

function mensajes(resultado: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries(
    (resultado.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]),
  );
}

describe('esquemaFormularioOperadorNuevo', () => {
  it('acepta datos válidos, normaliza el código y descarta la confirmación', () => {
    const r = esquemaFormularioOperadorNuevo.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.codigo).toBe('REC-010');
      expect(r.data).not.toHaveProperty('confirmacion');
      expect(r.data.password).toBe('Clave-segura1');
    }
  });

  it('exige documento, nombres, apellidos y código', () => {
    const r = esquemaFormularioOperadorNuevo.safeParse({
      ...valido,
      documento: ' ',
      nombres: '',
      apellidos: '',
      codigo: '',
    });
    expect(r.success).toBe(false);
    const m = mensajes(r);
    expect(m.documento).toBe('Escribe el número de documento.');
    expect(m.nombres).toBe('Escribe los nombres.');
    expect(m.apellidos).toBe('Escribe los apellidos.');
    expect(m.codigo).toBe('Escribe el código de empleado.');
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    const r = esquemaFormularioOperadorNuevo.safeParse({
      ...valido,
      password: 'corta1',
      confirmacion: 'corta1',
    });
    expect(r.success).toBe(false);
    expect(mensajes(r).password).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    );
  });

  it('rechaza contraseñas distintas y marca la confirmación', () => {
    const r = esquemaFormularioOperadorNuevo.safeParse({
      ...valido,
      confirmacion: 'otra-clave-9',
    });
    expect(r.success).toBe(false);
    expect(mensajes(r).confirmacion).toBe('Las contraseñas no coinciden.');
  });

  it('solo admite los tres roles de la aplicación', () => {
    expect(
      esquemaFormularioOperadorNuevo.safeParse({ ...valido, rol: 'ADMIN' })
        .success,
    ).toBe(true);
    expect(
      esquemaFormularioOperadorNuevo.safeParse({ ...valido, rol: 'SUPERVISOR' })
        .success,
    ).toBe(true);
    expect(
      esquemaFormularioOperadorNuevo.safeParse({ ...valido, rol: 'JEFE' })
        .success,
    ).toBe(false);
  });
});

describe('esquemaFormularioOperadorEdicion', () => {
  it('valida nombres, apellidos y rol', () => {
    expect(
      esquemaFormularioOperadorEdicion.safeParse({
        nombres: 'A',
        apellidos: 'B',
        rol: 'SUPERVISOR',
      }).success,
    ).toBe(true);
    const r = esquemaFormularioOperadorEdicion.safeParse({
      nombres: '',
      apellidos: ' ',
      rol: 'SUPERVISOR',
    });
    expect(r.success).toBe(false);
    expect(mensajes(r).nombres).toBe('Escribe los nombres.');
    expect(mensajes(r).apellidos).toBe('Escribe los apellidos.');
  });
});

describe('esquemaFormularioPassword', () => {
  it('exige 8 caracteres y que coincidan', () => {
    expect(
      esquemaFormularioPassword.safeParse({
        password: 'Nueva-clave-1',
        confirmacion: 'Nueva-clave-1',
      }).success,
    ).toBe(true);
    expect(
      mensajes(
        esquemaFormularioPassword.safeParse({
          password: '1234567',
          confirmacion: '1234567',
        }),
      ).password,
    ).toBe('La contraseña debe tener al menos 8 caracteres.');
    expect(
      mensajes(
        esquemaFormularioPassword.safeParse({
          password: 'Nueva-clave-1',
          confirmacion: 'x',
        }),
      ).confirmacion,
    ).toBe('Las contraseñas no coinciden.');
  });
});
