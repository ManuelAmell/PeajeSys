import { z } from 'zod';

/**
 * Esquema del diálogo de tarifa de Admin.dc.html.
 * Los mensajes de validación provienen de src/api/dominio/tarifa.ts (B1a) y del
 * esquema Zod de tarifas de src/types (esquemaTarifaNueva, chk_monto_positivo
 * y chk_fechas_vigencia del DDL).
 */
export const esquemaFormularioTarifa = z
  .object({
    monto: z
      .string()
      .refine(
        (valor) => /^\d+$/.test(valor) && parseInt(valor, 10) > 0,
        'El monto debe ser mayor que 0',
      )
      .transform((valor) => parseInt(valor, 10)),
    resolucion: z
      .string()
      .refine(
        (valor) => valor.trim().length > 0,
        'Indica la resolución que autoriza la tarifa.',
      )
      .refine(
        (valor) => valor.length <= 100,
        'La resolución no puede superar 100 caracteres.',
      )
      .transform((valor) => valor.trim()),
    desde: z
      .string()
      .refine(
        (valor) => valor.trim().length > 0,
        'Indica desde qué fecha rige.',
      )
      .refine(
        (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor),
        'La fecha debe tener formato AAAA-MM-DD.',
      ),
    hasta: z
      .string()
      .refine(
        (valor) => valor === '' || /^\d{4}-\d{2}-\d{2}$/.test(valor),
        'La fecha debe tener formato AAAA-MM-DD.',
      )
      .transform((valor) => (valor === '' ? null : valor)),
  })
  .superRefine((datos, ctx) => {
    if (datos.hasta && datos.hasta < datos.desde) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasta'],
        message: 'La fecha de fin debe ser posterior o igual a la de inicio.',
      });
    }
  });

/** Valores tal como los maneja el formulario (todo texto). */
export type ValoresFormularioTarifa = z.input<typeof esquemaFormularioTarifa>;

/** Datos validados y transformados listos para la API. */
export type DatosFormularioTarifa = z.output<typeof esquemaFormularioTarifa>;
