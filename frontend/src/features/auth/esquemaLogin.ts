import { z } from 'zod';

/**
 * Credenciales del formulario de Login.dc.html:
 * código de empleado en mayúsculas con máximo 8 caracteres y contraseña no vacía.
 * Los mensajes de validación son los del prototipo, palabra por palabra.
 */
export const esquemaLogin = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'Escribe tu código de empleado.')
    .max(8, 'El código de empleado tiene máximo 8 caracteres.')
    .transform((valor) => valor.toUpperCase()),
  clave: z.string().min(1, 'Escribe tu contraseña.'),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
