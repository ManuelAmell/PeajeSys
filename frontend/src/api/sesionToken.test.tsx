import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { clienteHttp, ErrorApi, esquemaRespuestaLogin, useLogin } from './index';
import { borrarToken, guardarToken, obtenerToken } from './sesionToken';

const TOKEN_REAL = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firma';

const RESPUESTA_REAL_RECAUDADOR = {
  token: TOKEN_REAL,
  usuario: {
    id: '1',
    codigo: 'EMP-001',
    nombre: 'Carlos Perez',
    nombre_completo: 'Carlos Alberto Perez',
    rol: 'RECAUDADOR',
    rol_txt: 'Recaudador',
    destino: '/operador',
    destino_txt: 'Ir a la terminal de cobro',
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  borrarToken();
});

describe('esquemaRespuestaLogin con la respuesta real de la API', () => {
  it('acepta la respuesta literal y conserva el token', () => {
    const r = esquemaRespuestaLogin.safeParse(RESPUESTA_REAL_RECAUDADOR);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.token).toBe(TOKEN_REAL);
      expect(r.data.usuario.rol_txt).toBe('Recaudador');
      expect(r.data.usuario.destino_txt).toBe('Ir a la terminal de cobro');
    }
  });

  it('mapea ADMINISTRADOR a ADMIN', () => {
    const r = esquemaRespuestaLogin.safeParse({
      ...RESPUESTA_REAL_RECAUDADOR,
      usuario: { ...RESPUESTA_REAL_RECAUDADOR.usuario, rol: 'ADMINISTRADOR' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.usuario.rol).toBe('ADMIN');
  });
});

describe('clienteHttp y el token de sesion', () => {
  it('envia Authorization Bearer cuando hay token', async () => {
    let cabecera: string | null = 'sin-llamar';
    server.use(
      http.get('*/api/prueba-token', ({ request }) => {
        cabecera = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    guardarToken('x');
    await clienteHttp('/prueba-token');
    expect(cabecera).toBe('Bearer x');
  });

  it('no envia Authorization cuando no hay token', async () => {
    let cabecera: string | null = 'sin-llamar';
    server.use(
      http.get('*/api/prueba-token', ({ request }) => {
        cabecera = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await clienteHttp('/prueba-token');
    expect(cabecera).toBeNull();
  });

  it('respeta una cabecera Authorization propia del llamador', async () => {
    let cabecera: string | null = null;
    server.use(
      http.get('*/api/prueba-token', ({ request }) => {
        cabecera = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    guardarToken('x');
    await clienteHttp('/prueba-token', { headers: { Authorization: 'Bearer otro' } });
    expect(cabecera).toBe('Bearer otro');
  });

  it('un 401 con token borra el token y lanza ErrorApi', async () => {
    server.use(
      http.get('*/api/prueba-token', () => new HttpResponse(null, { status: 401 })),
    );
    guardarToken('x');
    await expect(clienteHttp('/prueba-token')).rejects.toBeInstanceOf(ErrorApi);
    expect(obtenerToken()).toBeNull();
  });
});

describe('useLogin y el token', () => {
  it('guarda el token en onSuccess', async () => {
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json(RESPUESTA_REAL_RECAUDADOR)),
    );
    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ codigo: 'EMP-001', clave: 'Turno123*' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(obtenerToken()).toBe(TOKEN_REAL);
  });
});
