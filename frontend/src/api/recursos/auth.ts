import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { clavesApi } from '../claves';
import { clienteHttp } from '../clienteHttp';
import { guardarToken } from '../sesionToken';

/**
 * La API devuelve el rol de administrador como ADMINISTRADOR; dentro de la
 * aplicación se usa ADMIN, así que se convierte en el borde.
 */
const esquemaRol = z
  .enum(['RECAUDADOR', 'SUPERVISOR', 'ADMINISTRADOR', 'ADMIN'])
  .transform((rol): 'RECAUDADOR' | 'SUPERVISOR' | 'ADMIN' =>
    rol === 'ADMINISTRADOR' ? 'ADMIN' : rol,
  );

export const esquemaRespuestaLogin = z.object({
  token: z.string().min(1),
  usuario: z.object({
    id: z.string(),
    codigo: z.string(),
    nombre: z.string(),
    nombre_completo: z.string().optional(),
    rol: esquemaRol,
    rol_txt: z.string(),
    destino: z.string(),
    destino_txt: z.string(),
  }),
  turno_abierto: z
    .object({
      id_turno: z.number(),
      id_caseta: z.number(),
      numero_carril: z.number(),
      tipo_carril: z.string(),
      id_estacion: z.number(),
      estacion_nombre: z.string(),
      fecha: z.string(),
      diurno: z.boolean(),
      fondo_inicial_caja: z.number(),
      total_recaudado_efectivo: z.number(),
    })
    .optional(),
});

export type RespuestaLogin = z.infer<typeof esquemaRespuestaLogin>;

export interface CredencialesLogin {
  codigo: string;
  clave: string;
}

export async function login(credenciales: CredencialesLogin): Promise<RespuestaLogin> {
  return clienteHttp.post<RespuestaLogin>('/auth/login', credenciales, {
    schema: esquemaRespuestaLogin,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      guardarToken(data.token);
      queryClient.setQueryData(clavesApi.auth.usuario(), data.usuario);
      queryClient.invalidateQueries({ queryKey: clavesApi.turnos.todas });
    },
  });
}
