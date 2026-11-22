import { EstadoDatos } from '@/components/feedback/EstadoDatos';
import { useCategorias } from '@/api/recursos/categorias';
import { romanDeCategoria, textoEjes, textoPeso } from './ayudas';
import { SiluetaCategoria } from './SiluetaCategoria';

/**
 * Sección Categorías vehiculares de Admin.dc.html: las 7 categorías del DML
 * en consulta de solo lectura, con silueta, código, ejes y peso máximo.
 */
export function SeccionCategorias() {
  const categorias = useCategorias();

  return (
    <section aria-labelledby="t-categorias" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1
          id="t-categorias"
          className="m-0 text-[28px] font-bold md:text-[32px]"
        >
          Categorías vehiculares
        </h1>
        <p className="m-0 text-[17px] text-texto-2">
          Esquema de siete categorías (Res. INVÍAS 0228 de 2013 y concesiones
          ANI). Consulta de solo lectura.
        </p>
      </div>

      <EstadoDatos
        isPending={categorias.isPending}
        isError={categorias.isError}
        error={categorias.error}
        data={categorias.data}
        esVacio={(lista) => !lista || lista.length === 0}
        onReintentar={() => categorias.refetch()}
        tituloError="No se pudieron cargar los datos"
        mensajeError="El servidor no respondió. Para no guardar cambios sobre datos viejos, la edición queda bloqueada hasta que carguen."
        tituloVacio="No hay categorías registradas"
        mensajeVacio="Cuando se registre una categoría aparecerá en esta sección."
      >
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
                  className="border-b-2 border-texto p-2.5 font-semibold"
                >
                  Código
                </th>
                <th
                  scope="col"
                  className="border-b-2 border-texto p-2.5 font-semibold"
                >
                  Ejes
                </th>
                <th
                  scope="col"
                  className="border-b-2 border-texto p-2.5 text-right font-semibold"
                >
                  Peso máximo
                </th>
              </tr>
            </thead>
            <tbody>
              {(categorias.data ?? []).map((categoria) => (
                <tr key={categoria.id_categoria}>
                  <td className="border-b border-superficie-2 p-2.5">
                    <span className="flex items-center gap-3">
                      <SiluetaCategoria
                        idCategoria={categoria.id_categoria}
                        ancho={96}
                        alto={36}
                      />
                      <span className="flex flex-col">
                        <strong>{romanDeCategoria(categoria.codigo)}</strong>
                        <span className="text-[14px] text-texto-2">
                          {categoria.descripcion}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="border-b border-superficie-2 p-2.5">
                    {categoria.codigo}
                  </td>
                  <td className="border-b border-superficie-2 p-2.5">
                    {textoEjes(
                      categoria.numero_ejes_min,
                      categoria.numero_ejes_max,
                    )}
                  </td>
                  <td className="border-b border-superficie-2 p-2.5 text-right">
                    {textoPeso(categoria.peso_maximo_ton)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoDatos>
    </section>
  );
}
