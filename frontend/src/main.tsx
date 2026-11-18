import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProveedoresApp } from '@/app/proveedores';
import { AppRouter } from '@/app/router';
import '@/index.css';

async function iniciarApp() {
  // TODO(B1a): Inicializar MSW en desarrollo cuando VITE_USAR_MOCKS=true
  // if (import.meta.env.DEV && import.meta.env.VITE_USAR_MOCKS === 'true') {
  //   const { iniciarMocks } = await import('@/mocks/browser');
  //   await iniciarMocks();
  // }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('No se encontró el elemento #root en el documento HTML');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ProveedoresApp>
        <AppRouter />
      </ProveedoresApp>
    </React.StrictMode>,
  );
}

iniciarApp();
