import { describe, expect, it } from 'vitest';
import { esquemaLogin } from './esquemaLogin';

describe('Esquema de credenciales de inicio de sesión (esquemaLogin)', () => {
  it('recorta espacios y pasa el código a mayúsculas', () => {
    const datos = esquemaLogin.parse({ codigo: '  emp-002  ', clave: 'prueba' });
    expect(datos.codigo).toBe('EMP-002');
    expect(datos.clave).toBe('prueba');
  });

  it('rechaza el código vacío con el mensaje del prototipo', () => {
    const resultado = esquemaLogin.safeParse({ codigo: '   ', clave: 'prueba' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'Escribe tu código de empleado.',
      );
    }
  });

  it('rechaza el código con más de 8 caracteres', () => {
    const resultado = esquemaLogin.safeParse({
      codigo: 'EMP-00299',
      clave: 'prueba',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'El código de empleado tiene máximo 8 caracteres.',
      );
    }
  });

  it('rechaza la contraseña vacía con el mensaje del prototipo', () => {
    const resultado = esquemaLogin.safeParse({ codigo: 'EMP-002', clave: '' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'Escribe tu contraseña.',
      );
    }
  });

  it('acepta el caso válido con 8 caracteres exactos', () => {
    const datos = esquemaLogin.parse({ codigo: 'ADMIN-01', clave: 'prueba' });
    expect(datos.codigo).toBe('ADMIN-01');
  });
});
