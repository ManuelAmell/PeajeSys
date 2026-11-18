import { useState } from 'react';
import { EstadoDatos } from '@/components/feedback/EstadoDatos';
import { useCategorias } from '@/api/recursos/categorias';
import { useEstaciones } from '@/api/recursos/estaciones';
import { useTarifas } from '@/api/recursos/tarifas';
import type { EntradaHistorialTarifa } from '@/api/dominio/tarifa';
import { formatearMoneda } from '@/lib/formato';
import type { Tarifa } from '@/types';
import { fechaLarga, romanDeCategoria, rutaSilueta } from './ayudas';
import { DialogoTarifa, type TarifaEnEdicion } from './DialogoTarifa';

export interface SeccionTarifasProps {
  onAviso?: (aviso: string) => void;
}

/**
 * Sección Tarifas por estación de Admin.dc.html: selector de estación, tabla
 * por categoría con una tarifa activa por categoría, aviso de categorías sin
 * tarifa, edición en diálogo e historial de cambios de la sesión.
 */
export function SeccionTarifas({ onAviso }: SeccionTarifasProps = {}) {
  const estaciones = useEstaciones();
  const categorias = useCategorias();
  const [idEstacion, setIdEstacion] = useState(1);
  const tarifas = useTarifas({ estacion: idEstacion });
  const [seleccion, setSeleccion] = useState<TarifaEnEdicion | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorialTarifa[]>([]);
  const [aviso, setAviso] = useState('');

  const cargando =
    estaciones.isPending || categorias.isPending || tarifas.isPending;
  const error =
    estaciones.isError || categorias.isError || tarifas.isError
      ? (estaciones.error ?? categorias.error ?? tarifas.error)
      : null;

  const reintentar = () => {
    estaciones.refetch();
    categorias.refetch();
    tarifas.refetch();
  };

  const estacion = estaciones.data?.find((e) => e.id_estacion === idEstacion);
  const tarifaActivaDe = (idCategoria: number): Tarifa | null =>
    tarifas.data?.find((t) => t.id_categoria === idCategoria && t.activa) ??
    null;

  const categoriasFaltantes = (categorias.data ?? []).filter(
    (c) => !tarifaActivaDe(c.id_categoria),
  );

  return (
    <section aria-labelledby="t-tarifas" className="flex flex-col gap-6">
      {aviso && (
        <p
          role="status"
          className="m-0 rounded-[6px] border-2 border-correcto bg-correcto-fondo p-[12px] px-[16px] text-[17px] font-semibold text-correcto-texto"
        >
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-1 basis-[640px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1
                id="t-tarifas"
                className="m-0 text-[28px] font-bold md:text-[32px]"
              >
                Tarifas por estación
              </h1>
              <p className="m-0 text-[17px] text-texto-2">
                Una tarifa activa por categoría. El monto debe ser mayor que 0
                (CHECK monto &gt; 0).
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ad-estacion"
                className="text-[15px] font-semibold"
              >
                Estación
              </label>
              <select
                id="ad-estacion"
                value={String(idEstacion)}
                onChange={(e) => {
                  setIdEstacion(Number(e.target.value));
                  setAviso('');
                  onAviso?.('');
                }}
                className="h-[44px] min-w-[220px] cursor-pointer rounded-[6px] border-2 border-borde-fuerte bg-superficie px-[12px] text-[17px] text-texto focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
              >
                {(estaciones.data ?? []).map((e) => (
                  <option key={e.id_estacion} value={e.id_estacion}>
                    {e.nombre} · {e.codigo_estacion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <EstadoDatos
            isPending={cargando}
            isError={error !== null}
            error={error}
            onReintentar={reintentar}
            tituloError="No se pudieron cargar los datos"
            mensajeError="El servidor no respondió. Para no guardar cambios sobre datos viejos, la edición queda bloqueada hasta que carguen."
            tituloVacio="No hay estaciones registradas"
            mensajeVacio="Cuando se registre una estación aparecerá en esta sección."
            esVacio={(data: unknown) => {
              const [listaEstaciones, listaCategorias] = data as [
                unknown,
                unknown,
              ];
              return (
                !Array.isArray(listaEstaciones) ||
                listaEstaciones.length === 0 ||
                !Array.isArray(listaCategorias) ||
                listaCategorias.length === 0
              );
            }}
            data={[estaciones.data, categorias.data] as const}
          >
            {estacion && (categorias.data ?? []).length > 0 && (
              <>
                {categoriasFaltantes.length > 0 && (
                  <p
                    role="alert"
                    aria-label={`${estacion.nombre} no tiene tarifa para las categorías ${categoriasFaltantes.map((c) => romanDeCategoria(c.codigo)).join(', ')}: esos vehículos no se podrían cobrar.`}
                    className="m-0 rounded-[6px] bg-aviso-fondo p-[12px] px-[16px] text-[17px] font-semibold text-aviso-texto"
                  >
                    {estacion.nombre} no tiene tarifa para las categorías{' '}
                    {categoriasFaltantes
                      .map((c) => romanDeCategoria(c.codigo))
                      .join(', ')}
                    : esos vehículos no se podrían cobrar.
                  </p>
                )}

                <div className="overflow-x-auto rounded-[10px] border border-borde bg-superficie px-5 pb-3 pt-2">
                  <table className="w-full min-w-[720px] border-collapse text-[16px]">
                    <thead>
                      <tr className="text-left text-[15px] text-texto-2">
                        <th
                          scope="col"
                          className="border-b-2 border-texto p-2.5 font-semibold"
                        >
                          Categoría
                        </th>
                        <th
                          scope="col"
                          className="border-b-2 border-texto p-2.5 text-right font-semibold"
                        >
                          Monto
                        </th>
                        <th
                          scope="col"
                          className="border-b-2 border-texto p-2.5 font-semibold"
                        >
                          Resolución
                        </th>
                        <th
                          scope="col"
                          className="border-b-2 border-texto p-2.5 font-semibold"
                        >
                          Vigente desde
                        </th>
                        <th
                          scope="col"
                          className="relative border-b-2 border-texto p-2.5 font-semibold"
                        >
                          <span className="sr-only">Acción</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categorias.data ?? []).map((categoria) => {
                        const activa = tarifaActivaDe(categoria.id_categoria);
                        const roman = romanDeCategoria(categoria.codigo);
                        return (
                          <tr key={categoria.id_categoria}>
                            <td className="border-b border-superficie-2 p-2.5">
                              <span className="flex items-center gap-3">
                                <img
                                  className="ps-silueta"
                                  src={rutaSilueta(categoria.id_categoria)}
                                  alt=""
                                  width={72}
                                  height={28}
                                />
                                <span className="flex flex-col">
                                  <strong>{roman}</strong>
                                  <span className="text-[14px] text-texto-2">
                                    {categoria.descripcion}
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td
                              className={`whitespace-nowrap border-b border-superficie-2 p-2.5 text-right text-[18px] font-bold ${
                                activa ? 'text-texto' : 'text-error'
                              }`}
                            >
                              {activa
                                ? formatearMoneda(activa.monto)
                                : 'SIN TARIFA'}
                            </td>
                            <td className="border-b border-superficie-2 p-2.5">
                              {activa?.resolucion_legal ?? 'No definida'}
                            </td>
                            <td className="border-b border-superficie-2 p-2.5">
                              {activa
                                ? fechaLarga(activa.fecha_inicio_vigencia)
                                : 'No definida'}
                            </td>
                            <td className="border-b border-superficie-2 p-2.5 text-right">
                              <button
                                type="button"
                                aria-label={`${activa ? 'Editar' : 'Definir'} tarifa de la categoría ${roman}`}
                                onClick={() =>
                                  setSeleccion({
                                    idEstacion: estacion.id_estacion,
                                    estacionNombre: estacion.nombre,
                                    idCategoria: categoria.id_categoria,
                                    roman,
                                    tarifaActiva: activa,
                                  })
                                }
                                className="h-[44px] cursor-pointer whitespace-nowrap rounded-[6px] border-2 border-texto bg-superficie px-[14px] text-[16px] font-semibold text-texto transition-colors hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
                              >
                                {activa ? 'Editar' : 'Definir tarifa'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </EstadoDatos>
        </div>

        <aside
          aria-labelledby="t-historial"
          className="min-w-0 flex-1 basis-[320px] rounded-[10px] border border-borde bg-superficie p-[22px]"
        >
          <h2 id="t-historial" className="m-0 text-[22px] font-bold">
            Historial de cambios
          </h2>
          <p className="m-0 mt-3 text-[15px] text-texto-2">
            En la base de datos lo guardará el trigger trg_auditoria_tarifas,
            pendiente del Avance 3.
          </p>
          {historial.length === 0 ? (
            <p className="m-0 py-[14px] text-[17px] text-texto-2">
              Aún no hay cambios en esta sesión. Edita una tarifa para ver aquí
              el valor anterior y el nuevo.
            </p>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {historial.map((entrada, indice) => (
                <li
                  key={`${entrada.titulo}-${indice}`}
                  className="flex flex-col gap-0.5 border-b border-superficie-2 py-3"
                >
                  <strong className="text-[17px]">{entrada.titulo}</strong>
                  <span className="text-[16px]">{entrada.cambio}</span>
                  <span className="text-[14px] text-texto-2">
                    {entrada.meta}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {seleccion && (
        <DialogoTarifa
          tarifa={seleccion}
          onCerrar={() => setSeleccion(null)}
          onGuardada={(entrada, mensajeAviso) => {
            setHistorial((previa) => [entrada, ...previa]);
            setSeleccion(null);
            setAviso(mensajeAviso);
            onAviso?.(mensajeAviso);
          }}
        />
      )}
    </section>
  );
}
