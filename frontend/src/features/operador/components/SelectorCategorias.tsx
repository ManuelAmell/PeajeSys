import type { CategoriaVista } from '../types';

export interface SelectorCategoriasProps {
  categorias: CategoriaVista[];
  categoriaSeleccionadaCodigo: string;
  onSeleccionarCategoria: (codigo: string) => void;
  avisoDiferencia?: string | null;
  resolucionTexto?: string;
  deshabilitado?: boolean;
}

export function SelectorCategorias({
  categorias,
  categoriaSeleccionadaCodigo,
  onSeleccionarCategoria,
  avisoDiferencia,
  resolucionTexto = 'Res. MinTransporte 0045/2026',
  deshabilitado = false,
}: SelectorCategoriasProps) {
  return (
    <fieldset className="m-0 p-0 border-none flex flex-col gap-2.5">
      <legend className="p-0 mb-2.5 text-[16px] font-semibold text-texto">
        Categoría · tarifa vigente {resolucionTexto}
      </legend>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {categorias.map((c) => {
          const seleccionada = c.codigo === categoriaSeleccionadaCodigo;
          const estaDeshabilitada = deshabilitado || c.deshabilitada;

          return (
            <button
              key={c.codigo}
              id={`op-cat-${c.codigo}`}
              type="button"
              aria-pressed={seleccionada}
              disabled={estaDeshabilitada}
              onClick={() => onSeleccionarCategoria(c.codigo)}
              className={`min-h-[168px] p-3 rounded-[8px] text-left flex flex-col gap-1.5 transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
                seleccionada
                  ? 'border-[3px] border-texto bg-[#FCBD17] text-sobre-acento shadow-sm'
                  : 'border-2 border-borde bg-superficie text-texto ps-opcion hover:border-texto'
              } ${estaDeshabilitada ? 'opacity-40 cursor-not-allowed hover:border-borde' : 'cursor-pointer'}`}
            >
              <span className="flex justify-between items-center w-full">
                <strong className="text-[20px] font-bold">{c.romano}</strong>
                <kbd
                  className={`font-semibold text-[14px] rounded-[4px] px-2 py-0.5 ${
                    seleccionada
                      ? 'bg-[#1f1d19] text-[#FCBD17]'
                      : 'bg-superficie-2 text-texto'
                  }`}
                >
                  {c.numero}
                </kbd>
              </span>

              <img
                src={c.siluetaUrl}
                alt=""
                width="144"
                height="52"
                className="ps-silueta w-full h-[52px] object-contain my-auto"
              />

              <span
                className={`text-[14px] md:text-[15px] leading-snug line-clamp-2 ${
                  seleccionada ? 'text-sobre-acento' : 'text-texto-3'
                }`}
              >
                {c.descripcion}
              </span>

              <strong className="text-[20px] md:text-[22px] font-bold mt-auto whitespace-nowrap">
                {c.deshabilitada ? (
                  <span className="text-[14px] font-medium text-texto-2">
                    {c.motivoDeshabilitada || 'Sin tarifa'}
                  </span>
                ) : (
                  c.tarifaTexto
                )}
              </strong>
            </button>
          );
        })}
      </div>

      {avisoDiferencia && (
        <p
          role="alert"
          className="m-0 p-3 rounded-[6px] bg-aviso-fondo text-aviso-texto text-[16px] font-semibold"
        >
          {avisoDiferencia}
        </p>
      )}
    </fieldset>
  );
}
