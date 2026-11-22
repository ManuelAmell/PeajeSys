import { z } from 'zod';
import type { RolOperador } from '@/types';

/**
 * Roles tal como los nombra la aplicación: el administrador es ADMIN dentro de
 * la app y ADMINISTRADOR en la API y la BD (mismo criterio que api/recursos/auth.ts).
 */
export const ROLES_FORMULARIO = ['RECAUDADOR', 'SUPERVISOR', 'ADMIN'] as const;
export type RolFormulario = (typeof ROLES_FORMULARIO)[number];

export const ETIQUETA_ROL: Record<RolFormulario, string> = {
  RECAUDADOR: 'Recaudador',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
};

/** Al enviar: ADMIN pasa a ADMINISTRADOR. */
export function rolParaApi(rol: RolFormulario): RolOperador {
  return rol === 'ADMIN' ? 'ADMINISTRADOR' : rol;
}

/** Al recibir: ADMINISTRADOR pasa a ADMIN. */
export function rolDesdeApi(rol: RolOperador | RolFormulario): RolFormulario {
  return rol === 'ADMINISTRADOR' ? 'ADMIN' : rol;
}

export const MINIMO_PASSWORD = 8;
const MAXIMO_PASSWORD = 72; // límite de BCrypt

const texto = (mensaje: string, max: number) =>
  z
    .string()
    .transform((valor) => valor.trim())
    .pipe(
      z
        .string()
        .min(1, mensaje)
        .max(max, `No puede superar ${max} caracteres.`),
    );

const esquemaRol = z.enum(ROLES_FORMULARIO, {
  errorMap: () => ({ message: 'Elige un rol.' }),
});

const campoPassword = z
  .string()
  .min(
    MINIMO_PASSWORD,
    `La contraseña debe tener al menos ${MINIMO_PASSWORD} caracteres.`,
  )
  .max(
    MAXIMO_PASSWORD,
    `La contraseña no puede superar ${MAXIMO_PASSWORD} caracteres.`,
  );

/** Compara la contraseña con su confirmación y marca la confirmación. */
function exigirCoincidencia(
  datos: { password: string; confirmacion: string },
  ctx: z.RefinementCtx,
) {
  if (datos.password !== datos.confirmacion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmacion'],
      message: 'Las contraseñas no coinciden.',
    });
  }
}

export const esquemaFormularioOperadorNuevo = z
  .object({
    documento: texto('Escribe el número de documento.', 20),
    nombres: texto('Escribe los nombres.', 100),
    apellidos: texto('Escribe los apellidos.', 100),
    codigo: texto('Escribe el código de empleado.', 20).transform((c) =>
      c.toUpperCase(),
    ),
    rol: esquemaRol,
    password: campoPassword,
    confirmacion: z.string(),
  })
  .superRefine(exigirCoincidencia)
  .transform(({ confirmacion: _confirmacion, ...resto }) => {
    void _confirmacion;
    return resto;
  });

export const esquemaFormularioOperadorEdicion = z.object({
  nombres: texto('Escribe los nombres.', 100),
  apellidos: texto('Escribe los apellidos.', 100),
  rol: esquemaRol,
});

export const esquemaFormularioPassword = z
  .object({ password: campoPassword, confirmacion: z.string() })
  .superRefine(exigirCoincidencia)
  .transform(({ password }) => ({ password }));

export type ValoresFormularioOperadorNuevo = z.input<
  typeof esquemaFormularioOperadorNuevo
>;
export type DatosFormularioOperadorNuevo = z.output<
  typeof esquemaFormularioOperadorNuevo
>;
export type ValoresFormularioOperadorEdicion = z.input<
  typeof esquemaFormularioOperadorEdicion
>;
export type DatosFormularioOperadorEdicion = z.output<
  typeof esquemaFormularioOperadorEdicion
>;
export type ValoresFormularioPassword = z.input<
  typeof esquemaFormularioPassword
>;
export type DatosFormularioPassword = z.output<
  typeof esquemaFormularioPassword
>;
