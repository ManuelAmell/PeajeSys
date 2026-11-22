import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SesionProvider } from '@/lib/sesion';
import { TemaProvider } from '@/lib/tema';
import { crearQueryClient } from '@/app/clienteQuery';
import OperadorFeatureRoutes from './routes';

function montar(ruta: string) {
  const qc = crearQueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TemaProvider temaPorDefecto="claro">
        <SesionProvider
          usuarioInicial={{
            id: '14',
            codigo: 'REC-002',
            nombre: 'Camilo Guzmán',
            rol: 'RECAUDADOR',
          }}
        >
          <MemoryRouter initialEntries={[ruta]}>
            <Routes>
              <Route path="/operador/*" element={<OperadorFeatureRoutes />} />
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </TemaProvider>
    </QueryClientProvider>,
  );
}

describe('Rutas del operador', () => {
  it('/operador/abrir-turno muestra la pantalla Abrir turno', async () => {
    montar('/operador/abrir-turno');
    expect(
      await screen.findByRole('heading', { name: /Abrir turno/i }),
    ).toBeInTheDocument();
  });

  it('el router anidado solo declara abrir-turno y el comodin', () => {
    const fuente = OperadorFeatureRoutes.toString();
    expect(fuente).not.toContain('"/abrir-turno"');
    expect(fuente).not.toContain('"/operador/abrir-turno"');
  });
});
