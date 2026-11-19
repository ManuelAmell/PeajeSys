import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProveedoresApp } from '@/app/proveedores';
import { AppRouter } from '@/app/router';
import '@/index.css';

async function iniciarApp() {
  if (import.meta.env.VITE_USAR_MOCKS === 'true') {
    const { worker } = await import('@/mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }

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
