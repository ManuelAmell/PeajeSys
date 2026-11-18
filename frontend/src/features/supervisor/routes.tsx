import { useLocation } from 'react-router-dom';
import { SupervisorPage } from './SupervisorPage';
import type { IdPestanaSupervisor } from './tipos';

export default function SupervisorFeatureRoutes() {
  const location = useLocation();
  const subruta = location.pathname.replace(/^\/supervisor\/?/, '');

  let tabInicial: IdPestanaSupervisor = 'arqueo';
  let filtroAuditoriaInicial: string | undefined;
  let forzarError = false;

  if (subruta === 'recaudo') {
    tabInicial = 'recaudo';
  } else if (subruta === 'auditoria') {
    tabInicial = 'auditoria';
  } else if (subruta === 'auditoria-vacia') {
    tabInicial = 'auditoria';
    filtroAuditoriaInicial = 'VOID';
  } else if (subruta === 'cuentas') {
    tabInicial = 'cuentas';
  } else if (subruta === 'error') {
    forzarError = true;
  }

  return (
    <SupervisorPage
      tabInicial={tabInicial}
      filtroAuditoriaInicial={filtroAuditoriaInicial}
      forzarError={forzarError}
    />
  );
}
