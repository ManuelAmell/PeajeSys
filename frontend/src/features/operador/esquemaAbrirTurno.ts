import { z } from 'zod';

/**
 * Criterio horario para turno diurno por defecto:
 * En Colombia y la operación de peajes de PeajeSys, la jornada diurna transcurre
 * entre las 06:00 y las 18:00 (6 AM - 6 PM). A partir de las 18:00 o antes de las 06:00,
 * el turno por defecto es nocturno.
 */
export function esHoraDiurnaPorDefecto(fecha = new Date()): boolean {
  const hora = fecha.getHours();
  return hora >= 6 && hora < 18;
}

export const esquemaAbrirTurnoForm = z.object({
  id_caseta: z
    .number({ invalid_type_error: 'Selecciona una caseta' })
    .int()
    .positive('Selecciona una caseta'),
  fondo_inicial_caja: z
    .number({ invalid_type_error: 'Ingresa un fondo inicial válido' })
    .gte(0, 'El fondo inicial no puede ser negativo'),
  diurno: z.boolean(),
});

export type FormularioAbrirTurnoValores = z.infer<typeof esquemaAbrirTurnoForm>;
