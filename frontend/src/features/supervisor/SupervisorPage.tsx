import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutApp } from '@/components/layout/LayoutApp';
import { PestanasSupervision } from './components/PestanasSupervision';
import { SeccionArqueo } from './components/SeccionArqueo';
import { SeccionAuditoria } from './components/SeccionAuditoria';
import { SeccionCuentas } from './components/SeccionCuentas';
import { SeccionRecaudo } from './components/SeccionRecaudo';
import { useSupervisorDatos } from './hooks/useSupervisorDatos';
import type { IdPestanaSupervisor } from './tipos';

export interface SupervisorPageProps {
  tabInicial?: IdPestanaSupervisor;
  filtroAuditoriaInicial?: string;
  forzarError?: boolean;
}

export function SupervisorPage({
  tabInicial = 'arqueo',
  filtroAuditoriaInicial,
  forzarError = false,
}: SupervisorPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab activo: por prop, por query param ?tab= o defecto
  const tabParam = searchParams.get('tab') as IdPestanaSupervisor | null;
  const [pestanaActiva, setPestanaActiva] = useState<IdPestanaSupervisor>(
    tabParam && ['arqueo', 'recaudo', 'auditoria', 'cuentas'].includes(tabParam)
      ? tabParam
      : tabInicial,
  );

  // Sincronizar si cambia tabInicial
  useEffect(() => {
    if (tabInicial) {
      setPestanaActiva(tabInicial);
    }
  }, [tabInicial]);

  // Manejar modo simulado desde URL (?mock=error | vacio | lento)
  const mockParam = searchParams.get('mock');
  const errorSimulado = forzarError || mockParam === 'error';

  const {
    isPending,
    isError: errorConsulta,
    refetchTodo,
    turnos,
    metricas,
    recaudo,
    diasGrafico,
    cuentas,
    auditorias,
  } = useSupervisorDatos({
    forzarError: errorSimulado,
  });

  const [forzarNormal, setForzarNormal] = useState(false);
  const mostrarError = (errorSimulado || errorConsulta) && !forzarNormal;

  const handleCambiarPestana = (id: IdPestanaSupervisor) => {
    setPestanaActiva(id);
    setSearchParams(
      (prev) => {
        prev.set('tab', id);
        return prev;
      },
      { replace: true },
    );
  };

  const handleReintentar = () => {
    setForzarNormal(true);
    if (mockParam === 'error') {
      setSearchParams(
        (prev) => {
          prev.delete('mock');
          return prev;
        },
        { replace: true },
      );
    }
    refetchTodo();
  };

  return (
    <LayoutApp titulo="Supervisión" subtitulo="Estación Gambote">
      <div className="p-4 md:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
        {/* Barra de navegación por pestañas accesibles */}
        <PestanasSupervision
          pestanaActiva={pestanaActiva}
          onCambiarPestana={handleCambiarPestana}
        />

        {/* Estado de carga */}
        {isPending && !mostrarError && (
          <div
            role="status"
            className="max-w-[640px] w-full bg-superficie border border-borde rounded-[10px] p-8 flex flex-col gap-3.5 shadow-sm"
          >
            <strong className="text-[22px] md:text-[24px] font-bold text-texto">
              Cargando turnos, recaudo y auditoría…
            </strong>
            <div
              aria-hidden="true"
              className="ps-franja-loading h-[10px] rounded-[2px]"
            />
            <span className="text-[16px] md:text-[17px] text-texto-2">
              Las cifras aparecen cuando el servidor termine de responder.
            </span>
          </div>
        )}

        {/* Estado de error */}
        {mostrarError && (
          <div
            role="alert"
            className="max-w-[640px] w-full bg-superficie border-2 border-error rounded-[10px] p-8 flex flex-col gap-3.5 shadow-sm"
          >
            <strong className="text-[22px] md:text-[24px] font-bold text-error">
              No se pudieron cargar los datos de la estación
            </strong>
            <span className="text-[16px] md:text-[17px] text-texto-3">
              El servidor no respondió. Las cifras que veías antes pueden estar desactualizadas, así que no se muestran.
            </span>
            <button
              type="button"
              onClick={handleReintentar}
              className="self-start h-[48px] px-5 border-2 border-texto rounded-[6px] bg-superficie text-texto text-[16px] md:text-[17px] font-semibold cursor-pointer hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-texto"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Contenido normal de la sección activa */}
        {!isPending && !mostrarError && (
          <>
            {pestanaActiva === 'arqueo' && (
              <SeccionArqueo turnos={turnos} metricas={metricas} />
            )}

            {pestanaActiva === 'recaudo' && (
              <SeccionRecaudo recaudo={recaudo} diasGrafico={diasGrafico} />
            )}

            {pestanaActiva === 'auditoria' && (
              <SeccionAuditoria
                auditorias={auditorias}
                filtroInicial={filtroAuditoriaInicial}
              />
            )}

            {pestanaActiva === 'cuentas' && (
              <SeccionCuentas cuentas={cuentas} />
            )}
          </>
        )}
      </div>
    </LayoutApp>
  );
}
