import { EstadoDatos } from '@/components/feedback/EstadoDatos';
import { useCasetas, useEstaciones } from '@/api/recursos/estaciones';
import { etiquetaTipoCarril } from './ayudas';

/**
 * Sección Estaciones y casetas de Admin.dc.html: consulta de solo lectura de
 * las estaciones del DML con sus casetas por carril (tipo y estado).
 */
export function SeccionEstaciones() {
  const estaciones = useEstaciones();
  const casetas = useCasetas();

  const cargando = estaciones.isPending || casetas.isPending;
  const error =
    estaciones.isError || casetas.isError
      ? (estaciones.error ?? casetas.error)
      : null;

  return (
    <section aria-labelledby="t-infra" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 id="t-infra" className="m-0 text-[28px] font-bold md:text-[32px]">
          Estaciones y casetas
        </h1>
        <p className="m-0 text-[17px] text-texto-2">
          Consulta de solo lectura en esta versión del diseño.
        </p>
      </div>

      <EstadoDatos
        isPending={cargando}
        isError={error !== null}
        error={error}
        data={estaciones.data}
        esVacio={(lista) => !lista || lista.length === 0}
        onReintentar={() => {
          estaciones.refetch();
          casetas.refetch();
        }}
        tituloError="No se pudieron cargar los datos"
        mensajeError="El servidor no respondió. Para no guardar cambios sobre datos viejos, la edición queda bloqueada hasta que carguen."
        tituloVacio="No hay estaciones registradas"
        mensajeVacio="Cuando se registre una estación aparecerá en esta sección."
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {(estaciones.data ?? []).map((estacion) => {
            const casetasEstacion = (casetas.data ?? [])
              .filter((c) => c.id_estacion === estacion.id_estacion)
              .sort((a, b) => a.numero_carril - b.numero_carril);
            return (
              <article
                key={estacion.id_estacion}
                className="flex flex-col gap-3 rounded-[10px] border border-borde bg-superficie p-[22px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="m-0 text-[22px] font-bold">
                      {estacion.nombre}
                    </h2>
                    <span className="text-[15px] text-texto-2">
                      {estacion.codigo_estacion} ·{' '}
                      {estacion.ubicacion_geografica} · sentido{' '}
                      {estacion.sentido_via}
                    </span>
                  </div>
                  <span className="whitespace-nowrap rounded-[4px] bg-correcto-fondo px-2 py-1 text-[14px] font-bold text-correcto-texto">
                    {estacion.estado}
                  </span>
                </div>
                <ul className="m-0 flex list-none flex-col p-0">
                  {casetasEstacion.map((caseta) => (
                    <li
                      key={caseta.id_caseta}
                      className="flex justify-between gap-3 border-t border-superficie-2 py-2.5 text-[17px]"
                    >
                      <span>
                        <strong>Carril {caseta.numero_carril}</strong> ·{' '}
                        {etiquetaTipoCarril(caseta.tipo_carril)}
                      </span>
                      <span className="text-[15px] font-bold text-correcto-texto">
                        {caseta.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </EstadoDatos>
    </section>
  );
}
