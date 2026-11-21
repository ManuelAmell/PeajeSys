import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { LayoutApp } from '@/components/layout/LayoutApp';
import { Button } from '@/components/ui/button';
import { EstadoCargando, EstadoError } from '@/components/feedback/EstadoDatos';
import { useCasetas, useEstaciones } from '@/api/recursos/estaciones';
import { useTurnos, useAbrirTurno } from '@/api/recursos/turnos';
import { ErrorApi } from '@/api/clienteHttp';
import { formatearMoneda } from '@/lib/formato';
import type { Caseta } from '@/types';
import {
  esHoraDiurnaPorDefecto,
  esquemaAbrirTurnoForm,
  FormularioAbrirTurnoValores,
} from './esquemaAbrirTurno';

const FONDOS_RAPIDOS = [50000, 100000, 200000];

export function AbrirTurnoPage() {
  const navigate = useNavigate();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    data: estaciones,
    isLoading: cargandoEstaciones,
    isError: errorEstaciones,
    refetch: reintentarEstaciones,
  } = useEstaciones();
  const {
    data: casetas,
    isLoading: cargandoCasetas,
    isError: errorCasetas,
    refetch: reintentarCasetas,
  } = useCasetas();
  const { data: turnosAbiertos, isLoading: cargandoTurnos } = useTurnos({
    estado: 'ABIERTO',
  });

  const mutacionAbrir = useAbrirTurno();

  const casetasOperativas = useMemo(() => {
    if (!casetas) return [];
    return casetas.filter((c) => c.estado === 'OPERATIVA');
  }, [casetas]);

  const casetasOcupadasIds = useMemo(() => {
    if (!turnosAbiertos) return new Set<number>();
    return new Set(
      turnosAbiertos
        .filter((t) => t.estado === 'ABIERTO')
        .map((t) => t.id_caseta),
    );
  }, [turnosAbiertos]);

  const casetasPorEstacion = useMemo(() => {
    const mapa = new Map<
      number,
      { estacionNombre: string; casetas: Caseta[] }
    >();
    if (!estaciones) return mapa;

    for (const est of estaciones) {
      mapa.set(est.id_estacion, { estacionNombre: est.nombre, casetas: [] });
    }

    for (const caseta of casetasOperativas) {
      const entrada = mapa.get(caseta.id_estacion);
      if (entrada) {
        entrada.casetas.push(caseta);
      } else {
        mapa.set(caseta.id_estacion, {
          estacionNombre: `Estación ${caseta.id_estacion}`,
          casetas: [caseta],
        });
      }
    }
    return mapa;
  }, [estaciones, casetasOperativas]);

  const primeraLibreId = useMemo(() => {
    const libre = casetasOperativas.find(
      (c) => !casetasOcupadasIds.has(c.id_caseta),
    );
    return libre?.id_caseta ?? 0;
  }, [casetasOperativas, casetasOcupadasIds]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormularioAbrirTurnoValores>({
    resolver: zodResolver(esquemaAbrirTurnoForm),
    defaultValues: {
      id_caseta: primeraLibreId,
      fondo_inicial_caja: 100000,
      diurno: esHoraDiurnaPorDefecto(),
    },
  });

  const fondoActual = watch('fondo_inicial_caja');
  const diurnoActual = watch('diurno');

  const cargandoRecursos =
    cargandoEstaciones || cargandoCasetas || cargandoTurnos;
  const hayErrorRecursos = Boolean(errorEstaciones || errorCasetas);

  const enviar = async (datos: FormularioAbrirTurnoValores) => {
    setErrorServidor(null);
    try {
      await mutacionAbrir.mutateAsync({
        id_caseta: datos.id_caseta,
        fondo_inicial_caja: datos.fondo_inicial_caja,
        diurno: datos.diurno,
      });
      navigate('/operador', { replace: true });
    } catch (err) {
      const errorApi = err instanceof ErrorApi ? err : null;
      const mensaje =
        errorApi?.message ??
        (err as Error)?.message ??
        'No se pudo abrir el turno.';
      setErrorServidor(mensaje);
    }
  };

  const reintentarTodo = () => {
    reintentarEstaciones();
    reintentarCasetas();
  };

  return (
    <LayoutApp titulo="Abrir turno" subtitulo="Apertura de turno en caseta">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 md:px-8">
        {cargandoRecursos && (
          <div role="status" className="my-8">
            <EstadoCargando
              titulo="Cargando estaciones y casetas…"
              mensaje="Consultando disponibilidad de casetas operativas."
            />
          </div>
        )}

        {!cargandoRecursos && hayErrorRecursos && (
          <div role="alert" className="my-8">
            <EstadoError
              titulo="No se pudieron cargar las casetas"
              mensaje="El servidor no respondió al consultar las estaciones y casetas disponibles."
              onReintentar={reintentarTodo}
            />
          </div>
        )}

        {!cargandoRecursos && !hayErrorRecursos && (
          <section
            aria-labelledby="titulo-abrir-turno"
            className="flex flex-col gap-6 rounded-[10px] border border-borde bg-superficie p-6 shadow-sm md:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <h1
                id="titulo-abrir-turno"
                className="m-0 text-[26px] font-bold tracking-tight text-texto md:text-[30px]"
              >
                Abrir turno
              </h1>
              <p className="m-0 text-[15px] text-texto-2 md:text-[16px]">
                Selecciona la caseta donde vas a operar y define el fondo
                inicial de caja para habilitar el cobro.
              </p>
            </div>

            {errorServidor && (
              <div
                role="alert"
                className="rounded-[8px] border-2 border-error bg-error-fondo p-4 text-[15px] font-semibold text-error"
              >
                {errorServidor}
              </div>
            )}

            <form
              onSubmit={handleSubmit(enviar)}
              noValidate
              className="flex flex-col gap-6"
            >
              {/* Selector de caseta */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="at-caseta"
                  className="text-[16px] font-semibold text-texto"
                >
                  Caseta
                </label>
                <select
                  id="at-caseta"
                  aria-invalid={Boolean(errors.id_caseta)}
                  aria-describedby={
                    errors.id_caseta ? 'at-caseta-error' : undefined
                  }
                  className={`h-[52px] rounded-[6px] border-2 bg-superficie px-3.5 text-[17px] font-semibold text-texto transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
                    errors.id_caseta ? 'border-error' : 'border-borde-fuerte'
                  }`}
                  {...register('id_caseta', {
                    valueAsNumber: true,
                    onChange: () => setErrorServidor(null),
                  })}
                >
                  <option value={0}>Selecciona una caseta…</option>
                  {Array.from(casetasPorEstacion.entries()).map(
                    ([idEstacion, grupo]) => (
                      <optgroup key={idEstacion} label={grupo.estacionNombre}>
                        {grupo.casetas.map((c) => {
                          const ocupada = casetasOcupadasIds.has(c.id_caseta);
                          const tipoTexto =
                            c.tipo_carril === 'MANUAL'
                              ? 'Manual'
                              : c.tipo_carril === 'MIXTO'
                                ? 'Mixto'
                                : 'Telepeaje exclusivo';
                          return (
                            <option
                              key={c.id_caseta}
                              value={c.id_caseta}
                              disabled={ocupada}
                            >
                              Carril {c.numero_carril} · {tipoTexto}
                              {ocupada ? ' — Ocupada' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ),
                  )}
                </select>
                {errors.id_caseta && (
                  <span
                    id="at-caseta-error"
                    role="alert"
                    className="text-[14px] font-semibold text-error"
                  >
                    {errors.id_caseta.message}
                  </span>
                )}
              </div>

              {/* Fondo inicial de caja */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="at-fondo"
                    className="text-[16px] font-semibold text-texto"
                  >
                    Fondo inicial de caja
                  </label>
                  <span className="text-[14px] font-medium text-texto-2">
                    {formatearMoneda(Number(fondoActual) || 0)}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="fondo_inicial_caja"
                  render={({ field }) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-texto-2">
                        $
                      </span>
                      <input
                        id="at-fondo"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={Boolean(errors.fondo_inicial_caja)}
                        aria-describedby={
                          errors.fondo_inicial_caja
                            ? 'at-fondo-error'
                            : undefined
                        }
                        value={
                          field.value !== undefined && field.value !== null
                            ? field.value
                                .toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                            : ''
                        }
                        onChange={(e) => {
                          setErrorServidor(null);
                          const digitsOnly = e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 9);
                          const num = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                          field.onChange(num);
                        }}
                        placeholder="100.000"
                        className={`h-[52px] w-full rounded-[6px] border-2 bg-superficie pl-8 pr-4 text-[20px] font-bold text-texto transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
                          errors.fondo_inicial_caja
                            ? 'border-error'
                            : 'border-borde-fuerte'
                        }`}
                      />
                    </div>
                  )}
                />
                {errors.fondo_inicial_caja && (
                  <span
                    id="at-fondo-error"
                    role="alert"
                    className="text-[14px] font-semibold text-error"
                  >
                    {errors.fondo_inicial_caja.message}
                  </span>
                )}

                {/* Accesos directos de fondo inicial */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[13px] font-semibold text-texto-2">
                    Comunes:
                  </span>
                  {FONDOS_RAPIDOS.map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() =>
                        setValue('fondo_inicial_caja', monto, {
                          shouldValidate: true,
                        })
                      }
                      className={`h-[36px] rounded-[6px] border px-3 text-[14px] font-semibold transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2 ${
                        fondoActual === monto
                          ? 'border-texto bg-marca-amarillo font-bold text-sobre-acento'
                          : 'border-borde bg-superficie-2 text-texto hover:bg-hover'
                      }`}
                    >
                      {formatearMoneda(monto)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horario de operación (Diurno / Nocturno) */}
              <div className="flex flex-col gap-2">
                <span className="text-[16px] font-semibold text-texto">
                  Horario de operación
                </span>
                <div
                  role="radiogroup"
                  aria-label="Horario de turno"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <label
                    htmlFor="at-horario-diurno"
                    aria-label="Turno diurno de 06:00 a 18:00"
                    className={`flex cursor-pointer items-center gap-3 rounded-[8px] border-2 p-3.5 transition-colors ${
                      diurnoActual
                        ? 'border-texto bg-superficie-2 text-texto shadow-sm'
                        : 'border-borde bg-superficie text-texto-2 hover:bg-hover'
                    }`}
                  >
                    <input
                      id="at-horario-diurno"
                      type="radio"
                      name="horario"
                      checked={diurnoActual === true}
                      onChange={() => setValue('diurno', true)}
                      className="h-5 w-5 accent-marca-amarillo"
                    />
                    <div className="flex flex-col">
                      <strong className="text-[16px] font-bold text-texto">
                        Diurno
                      </strong>
                      <span className="text-[13px] text-texto-2">
                        06:00 a 18:00
                      </span>
                    </div>
                  </label>

                  <label
                    htmlFor="at-horario-nocturno"
                    aria-label="Turno nocturno de 18:00 a 06:00"
                    className={`flex cursor-pointer items-center gap-3 rounded-[8px] border-2 p-3.5 transition-colors ${
                      !diurnoActual
                        ? 'border-texto bg-superficie-2 text-texto shadow-sm'
                        : 'border-borde bg-superficie text-texto-2 hover:bg-hover'
                    }`}
                  >
                    <input
                      id="at-horario-nocturno"
                      type="radio"
                      name="horario"
                      checked={diurnoActual === false}
                      onChange={() => setValue('diurno', false)}
                      className="h-5 w-5 accent-marca-amarillo"
                    />
                    <div className="flex flex-col">
                      <strong className="text-[16px] font-bold text-texto">
                        Nocturno
                      </strong>
                      <span className="text-[13px] text-texto-2">
                        18:00 a 06:00
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botón de envío */}
              <Button
                type="submit"
                variant="primario"
                disabled={isSubmitting || mutacionAbrir.isPending}
                className="mt-2 h-[56px] border-[3px] text-[19px]"
              >
                {isSubmitting || mutacionAbrir.isPending
                  ? 'Abriendo turno…'
                  : 'Abrir turno'}
              </Button>
            </form>
          </section>
        )}
      </div>
    </LayoutApp>
  );
}

export default AbrirTurnoPage;
