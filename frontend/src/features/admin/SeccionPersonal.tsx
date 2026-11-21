import { useState } from 'react';
import { EstadoDatos } from '@/components/feedback/EstadoDatos';
import {
  useActualizarOperador,
  useOperadores,
} from '@/api/recursos/operadores';
import { ErrorApi } from '@/api/clienteHttp';
import { sinTildes } from './ayudas';

export interface SeccionPersonalProps {
  onAviso?: (aviso: string) => void;
}

/**
 * Sección Personal de Admin.dc.html: lista de operadores del DML con búsqueda
 * por nombre o código tolerante a tildes y acción de activar o desactivar.
 * No tiene altas: el prototipo no las contempla y el bloque no las construye.
 */
export function SeccionPersonal({ onAviso }: SeccionPersonalProps = {}) {
  const operadores = useOperadores();
  const actualizar = useActualizarOperador();
  const [busqueda, setBusqueda] = useState('');
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const texto = sinTildes(busqueda.trim());
  const filtrados = (operadores.data ?? []).filter((operador) => {
    if (!texto) {
      return true;
    }
    const nombreCompleto = sinTildes(
      `${operador.nombres} ${operador.apellidos}`,
    );
    return (
      nombreCompleto.includes(texto) ||
      sinTildes(operador.codigo_empleado).includes(texto)
    );
  });

  const alternarEstado = async (
    idOperador: number,
    nombreCompleto: string,
    estabaActivo: boolean,
  ) => {
    setErrorAccion(null);
    const nuevoEstado = estabaActivo ? 'INACTIVO' : 'ACTIVO';
    try {
      await actualizar.mutateAsync({
        id: idOperador,
        datos: { estado: nuevoEstado },
      });
      const mensajeAviso = `${nombreCompleto} ahora está ${nuevoEstado}.`;
      setAviso(mensajeAviso);
      onAviso?.(mensajeAviso);
    } catch (error) {
      const errorApi = error instanceof ErrorApi ? error : null;
      setErrorAccion(
        errorApi?.message ??
          `No se pudo actualizar el estado de ${nombreCompleto}.`,
      );
    }
  };

  return (
    <section aria-labelledby="t-personal" className="flex flex-col gap-4">
      {aviso && (
        <p
          role="status"
          className="m-0 rounded-[6px] border-2 border-correcto bg-correcto-fondo p-[12px] px-[16px] text-[17px] font-semibold text-correcto-texto"
        >
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1
            id="t-personal"
            className="m-0 text-[28px] font-bold md:text-[32px]"
          >
            Personal
          </h1>
          <p className="m-0 text-[17px] text-texto-2">
            Un usuario INACTIVO no puede iniciar sesión ni abrir turno.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ad-buscar" className="text-[15px] font-semibold">
            Buscar por nombre o código
          </label>
          <input
            id="ad-buscar"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setErrorAccion(null);
            }}
            autoComplete="off"
            placeholder="EMP-000 o nombre"
            className="h-[44px] w-[260px] max-w-full rounded-[6px] border-2 border-borde-fuerte bg-superficie px-[12px] text-[17px] font-medium text-texto focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
          />
        </div>
      </div>

      <EstadoDatos
        isPending={operadores.isPending}
        isError={operadores.isError}
        error={operadores.error}
        data={operadores.data}
        onReintentar={() => operadores.refetch()}
        tituloError="No se pudieron cargar los datos"
        mensajeError="El servidor no respondió. Para no guardar cambios sobre datos viejos, la edición queda bloqueada hasta que carguen."
        tituloVacio="No hay personal registrado"
        mensajeVacio="Cuando se registre personal aparecerá en esta sección."
      >
        {filtrados.length === 0 ? (
          <div
            role="status"
            className="flex flex-col gap-1.5 rounded-[6px] px-2 py-7"
          >
            <strong className="text-[20px]">
              Nadie coincide con la búsqueda
            </strong>
            <span className="text-[16px] text-texto-2">
              Revisa el código (EMP-000) o escribe parte del nombre.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-borde bg-superficie px-5 pb-3 pt-2">
            <table className="w-full min-w-[760px] border-collapse text-[16px]">
              <thead>
                <tr className="text-left text-[15px] text-texto-2">
                  <th
                    scope="col"
                    className="border-b-2 border-texto p-2.5 font-semibold whitespace-nowrap"
                  >
                    Código
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-texto p-2.5 font-semibold"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-texto p-2.5 font-semibold"
                  >
                    Documento
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-texto p-2.5 font-semibold"
                  >
                    Rol
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-texto p-2.5 font-semibold"
                  >
                    Estado
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
                {filtrados.map((operador) => {
                  const activo = operador.estado === 'ACTIVO';
                  const nombreCompleto = `${operador.nombres} ${operador.apellidos}`;
                  return (
                    <tr key={operador.id_operador}>
                      <td className="border-b border-superficie-2 p-2.5 font-mono font-bold whitespace-nowrap">
                        {operador.codigo_empleado}
                      </td>
                      <td className="border-b border-superficie-2 p-2.5">
                        {nombreCompleto}
                      </td>
                      <td className="border-b border-superficie-2 p-2.5">
                        {operador.numero_documento}
                      </td>
                      <td className="border-b border-superficie-2 p-2.5">
                        {operador.rol}
                      </td>
                      <td className="border-b border-superficie-2 p-2.5">
                        <span
                          className={`rounded-[4px] px-2 py-1 text-[14px] font-bold ${
                            activo
                              ? 'bg-correcto-fondo text-correcto-texto'
                              : 'bg-superficie-2 text-texto-3'
                          }`}
                        >
                          {operador.estado}
                        </span>
                      </td>
                      <td className="border-b border-superficie-2 p-2.5 text-right">
                        <button
                          type="button"
                          aria-label={`${activo ? 'Desactivar a' : 'Activar a'} ${nombreCompleto}`}
                          disabled={actualizar.isPending}
                          onClick={() =>
                            alternarEstado(
                              operador.id_operador,
                              nombreCompleto,
                              activo,
                            )
                          }
                          className="h-[44px] cursor-pointer whitespace-nowrap rounded-[6px] border-2 border-texto bg-superficie px-[14px] text-[16px] font-semibold text-texto transition-colors hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </EstadoDatos>

      {errorAccion && (
        <p
          role="alert"
          className="m-0 rounded-[6px] bg-error-fondo p-[10px] px-[14px] text-[16px] font-semibold text-error"
        >
          {errorAccion}
        </p>
      )}
    </section>
  );
}
