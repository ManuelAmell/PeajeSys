import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { abrirTurno, useAbrirTurno } from './turnos';
import { reiniciarDb } from '@/mocks/db';
import { crearQueryClient } from '@/app/clienteQuery';
import { SesionProvider } from '@/lib/sesion';

function crearWrapper() {
  const qc = crearQueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <SesionProvider
        usuarioInicial={{
          id: '14',
          codigo: 'REC-002',
          nombre: 'Camilo Guzmán',
          rol: 'RECAUDADOR',
        }}
      >
        <MemoryRouter>{children}</MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>
  );
}

describe('Recurso turnos - abrirTurno', () => {
  beforeEach(() => {
    reiniciarDb();
  });

  it('abrirTurno crea un nuevo turno y valida con esquemaTurno', async () => {
    const turno = await abrirTurno({
      id_caseta: 1,
      fondo_inicial_caja: 150000,
      diurno: true,
      id_operador: 14,
    });

    expect(turno).toBeDefined();
    expect(turno.id_turno).toBeGreaterThan(0);
    expect(turno.id_caseta).toBe(1);
    expect(turno.fondo_inicial_caja).toBe(150000);
    expect(turno.diurno).toBe(true);
    expect(turno.estado).toBe('ABIERTO');
  });

  it('useAbrirTurno ejecuta la mutación y retorna el turno abierto', async () => {
    const { result } = renderHook(() => useAbrirTurno(), {
      wrapper: crearWrapper(),
    });

    result.current.mutate({
      id_caseta: 4,
      fondo_inicial_caja: 200000,
      diurno: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id_caseta).toBe(4);
    expect(result.current.data?.estado).toBe('ABIERTO');
  });
});

