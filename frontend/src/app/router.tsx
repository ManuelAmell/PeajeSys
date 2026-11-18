import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireRol, useSesion } from '@/lib/sesion';
import { rutaPorDefectoSegunRol } from '@/lib/roles';
import { EstadoCargando } from '@/components/feedback/EstadoDatos';
import { NotFoundPage } from '@/features/NotFoundPage';

// Carga perezosa de los módulos de feature
const AuthFeature = lazy(() => import('@/features/auth/routes'));
const OperadorFeature = lazy(() => import('@/features/operador/routes'));
const SupervisorFeature = lazy(() => import('@/features/supervisor/routes'));
const AdminFeature = lazy(() => import('@/features/admin/routes'));

function SuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-fondo">
      <EstadoCargando
        titulo="Cargando módulo…"
        mensaje="Preparando la vista del sistema."
        className="max-w-md w-full"
      />
    </div>
  );
}

function RutaRaiz() {
  const { usuario } = useSesion();
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={rutaPorDefectoSegunRol(usuario.rol)} replace />;
}

/**
 * Registro central de rutas de PeajeSys.
 * Los bloques B2 a B5 solo implementan su respectivo módulo perezoso
 * en src/features/<x>/routes.tsx sin necesidad de modificar este archivo.
 */
export function AppRouter() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<RutaRaiz />} />
        <Route path="/login" element={<AuthFeature />} />
        <Route
          path="/operador/*"
          element={
            <RequireRol rolPermitido="RECAUDADOR">
              <OperadorFeature />
            </RequireRol>
          }
        />
        <Route
          path="/supervisor/*"
          element={
            <RequireRol rolPermitido="SUPERVISOR">
              <SupervisorFeature />
            </RequireRol>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RequireRol rolPermitido="ADMIN">
              <AdminFeature />
            </RequireRol>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
