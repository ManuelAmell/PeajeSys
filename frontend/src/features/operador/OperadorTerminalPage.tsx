import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Franja } from '@/components/layout/Franja';
import { EstadoCargando, EstadoError } from '@/components/feedback/EstadoDatos';
import { CabeceraOperador } from './components/CabeceraOperador';
import { SelectorPlaca } from './components/SelectorPlaca';
import { SelectorCategorias } from './components/SelectorCategorias';
import { SelectorMetodoPago } from './components/SelectorMetodoPago';
import { CobroEfectivo } from './components/CobroEfectivo';
import { CobroTelepeaje } from './components/CobroTelepeaje';
import { BotonCobrar } from './components/BotonCobrar';
import { ResumenCaja } from './components/ResumenCaja';
import { DialogoCierreTurno } from './components/DialogoCierreTurno';
import { PanelTransaccionesTurno } from '@/features/transacciones-turno/PanelTransaccionesTurno';
import { useTerminalCobro } from './hooks/useTerminalCobro';
import { useAtajosTeclado } from './hooks/useAtajosTeclado';

export function OperadorTerminalPage() {
  const terminal = useTerminalCobro();

  // Asegurar que la cabecera permanezca visible y la página no se desplace
  useEffect(() => {
    window.scrollTo(0, 0);
  });

  // Gestión de atajos de teclado
  useAtajosTeclado({
    habilitado:
      !terminal.estaCargandoTodo &&
      !terminal.hayErrorCarga &&
      !!terminal.turnoAbierto,
    onSeleccionarCategoria: terminal.onSeleccionarCategoriaNumero,
    onSeleccionarMetodo: terminal.onSeleccionarMetodo,
    onCobrar: terminal.ejecutarCobro,
    onEscape: terminal.onCancelarCierre,
    puedeCobrar: terminal.puedeCobrar,
    modalAbierto: terminal.cierreModalAbierto,
  });

  // Redirigir a Abrir turno si el operador no tiene un turno abierto asignado
  if (
    !terminal.estaCargandoTodo &&
    !terminal.hayErrorCarga &&
    !terminal.turnoAbierto
  ) {
    return <Navigate to="/operador/abrir-turno" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-fondo text-texto font-sans">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-[#FCBD17] focus:px-4 focus:py-2.5 focus:font-bold focus:text-sobre-acento focus:outline-[3px] focus:outline-texto"
      >
        Saltar al contenido
      </a>

      {/* Cabecera de la terminal con datos de turno, estación y operadora */}
      <CabeceraOperador
        estacionNombre={terminal.estacionNombre}
        carrilTexto={terminal.carrilTexto}
        idTurno={terminal.idTurno}
        fechaTurno={terminal.fechaTurno}
        esDiurno={terminal.esDiurno}
        operadorNombre={terminal.operadorNombre}
        cerrado={terminal.turnoEstaCerrado}
        onAbrirCierre={terminal.onAbrirCierre}
        botonCierreRef={terminal.botonCierreTriggerRef}
      />

      <Franja />

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex-1 outline-none p-3 sm:p-5 md:p-8 flex flex-col justify-start"
      >
        {/* Estado: Cargando datos */}
        {terminal.estaCargandoTodo && (
          <div className="w-full max-w-xl mx-auto my-12" role="status">
            <EstadoCargando
              titulo="Cargando el turno y las tarifas vigentes…"
              mensaje="El cobro se habilita cuando lleguen los datos del servidor."
            />
          </div>
        )}

        {/* Estado: Error en carga */}
        {!terminal.estaCargandoTodo && terminal.hayErrorCarga && (
          <div className="w-full max-w-xl mx-auto my-12" role="alert">
            <EstadoError
              titulo="No se pudo cargar el turno"
              mensaje="El servidor no respondió, así que no se puede cobrar todavía. Revisa la conexión y vuelve a intentarlo; si sigue fallando, avisa al supervisor."
              onReintentar={terminal.reintentarCarga}
            />
          </div>
        )}

        {/* Estado: Normal con turno abierto */}
        {!terminal.estaCargandoTodo &&
          !terminal.hayErrorCarga &&
          terminal.turnoAbierto && (
            <div className="w-full max-w-[1400px] mx-auto flex flex-wrap gap-6 items-start">
              {/* Columna izquierda: Formulario de cobro y registro de paso */}
              <section
                aria-labelledby="titulo-paso"
                className="flex-[999_1_620px] min-w-0 bg-superficie border border-borde rounded-[10px] p-4 sm:p-6 md:p-7 flex flex-col gap-6 shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <h1
                    id="titulo-paso"
                    className="m-0 text-[26px] md:text-[28px] font-bold text-texto tracking-tight"
                  >
                    Terminal de cobro
                  </h1>
                  <p className="m-0 text-[15px] text-texto-2">
                    Registro de paso vehicular y emisión de ticket en caseta.
                  </p>
                </div>

                {/* Banner de error al cobrar (ej. 409 turno cerrado) */}
                {terminal.errorCobro && (
                  <div
                    role="alert"
                    className="p-3.5 md:p-4 rounded-[8px] bg-error-fondo border-2 border-error text-error-texto font-semibold text-[15px]"
                  >
                    {terminal.errorCobro}
                  </div>
                )}

                {/* Banner de éxito de ticket emitido */}
                {terminal.avisoExito && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 md:p-4 rounded-[8px] bg-correcto-fondo border-2 border-correcto shadow-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-[17px] md:text-[18px] text-correcto-texto">
                        Ticket {terminal.avisoExito.ticket} emitido
                      </strong>
                      <span className="text-[15px] md:text-[16px] text-texto font-medium">
                        {terminal.avisoExito.texto}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={terminal.onCerrarAvisoExito}
                      className="h-[44px] px-4 rounded-[6px] border-2 border-texto bg-superficie text-texto text-[15px] font-semibold ps-secundario transition-colors focus-visible:outline-[3px] focus-visible:outline-texto focus-visible:outline-offset-2"
                    >
                      Siguiente vehículo
                    </button>
                  </div>
                )}

                {/* Selector y entrada de Placa */}
                <SelectorPlaca
                  placa={terminal.placa}
                  onCambiarPlaca={terminal.setPlaca}
                  ayudaTexto={terminal.ayudaPlacaTexto}
                  ayudaTipo={terminal.ayudaPlacaTipo}
                  inputRef={terminal.placaInputRef}
                  deshabilitado={terminal.turnoEstaCerrado}
                />

                {/* Selector de 7 Categorías */}
                <SelectorCategorias
                  categorias={terminal.categorias}
                  categoriaSeleccionadaCodigo={
                    terminal.categoriaSeleccionadaCodigo
                  }
                  onSeleccionarCategoria={terminal.onSeleccionarCategoria}
                  avisoDiferencia={terminal.avisoDiferenciaCategoria}
                  resolucionTexto={terminal.resolucionTexto}
                  deshabilitado={terminal.turnoEstaCerrado}
                />

                {/* Selector de Métodos de Pago */}
                <SelectorMetodoPago
                  metodos={terminal.metodos}
                  metodoSeleccionado={terminal.metodoSeleccionado}
                  onSeleccionarMetodo={terminal.onSeleccionarMetodo}
                  avisoCarril={terminal.avisoCarrilMetodo}
                  deshabilitado={terminal.turnoEstaCerrado}
                />

                {/* Panel de Cobro en Efectivo */}
                {terminal.metodoSeleccionado === 'EFECTIVO' && (
                  <CobroEfectivo
                    valorRecibidoTexto={terminal.recibidoTexto}
                    onCambiarRecibido={terminal.onCambiarRecibido}
                    opcionesRapidas={terminal.opcionesRapidas}
                    onSeleccionarRapida={terminal.onSeleccionarRapida}
                    tarifaActual={terminal.tarifaActual}
                    inputRef={terminal.recibidoInputRef}
                    deshabilitado={terminal.turnoEstaCerrado}
                  />
                )}

                {/* Panel de Cobro por Telepeaje */}
                {terminal.metodoSeleccionado === 'TELEPEAJE' && (
                  <CobroTelepeaje
                    tagSerial={terminal.tagSerial}
                    saldoActual={terminal.saldoActual}
                    saldoPosterior={terminal.saldoPosterior}
                    esValidoParaDebitar={terminal.esValidoParaDebitarTag}
                    mensajeError={terminal.mensajeErrorTag}
                  />
                )}

                {/* Panel de Paso Exento */}
                {terminal.metodoSeleccionado === 'EXENTO' && (
                  <p className="m-0 p-4 rounded-[8px] border-2 border-dashed border-texto-2 bg-superficie-2 text-[16px] text-texto leading-relaxed">
                    El paso se registra con estado EXENTO y monto $ 0, y queda
                    en la auditoría de transacciones.
                  </p>
                )}

                {/* Botón principal de cobro */}
                <BotonCobrar
                  onCobrar={terminal.ejecutarCobro}
                  puedeCobrar={terminal.puedeCobrar}
                  textoBoton={terminal.textoBotonCobrar}
                  mensajeBloqueo={terminal.mensajeBloqueo}
                  esExitoOListo={terminal.esExitoOListo}
                  estaCargando={terminal.estaRegistrandoPaso}
                />
              </section>

              {/* Columna derecha: Resumen de Caja y Últimos Pasos */}
              <ResumenCaja
                fondoInicial={terminal.fondoInicialCaja}
                totalRecaudadoEfectivo={terminal.totalRecaudadoEfectivo}
                pasos={terminal.pasos}
              />

              {/* Transacciones del turno con la opción de anular: plegado para no estorbar al cobro */}
              <div className="basis-full">
                <PanelTransaccionesTurno
                  idTurno={terminal.idTurno}
                  puedeAnular={!terminal.turnoEstaCerrado}
                  colapsable
                />
              </div>
            </div>
          )}
      </main>

      {/* Diálogo modal de cierre de turno */}
      <DialogoCierreTurno
        abierto={terminal.cierreModalAbierto}
        idTurno={terminal.idTurno}
        totalRecaudadoEfectivo={terminal.totalRecaudadoEfectivo}
        declaradoTexto={terminal.declaradoTexto}
        onCambiarDeclarado={terminal.onCambiarDeclarado}
        onConfirmarCierre={terminal.ejecutarConfirmarCierre}
        onCancelar={terminal.onCancelarCierre}
        estaCerrando={terminal.estaCerrandoTurno}
        errorCierre={terminal.errorCierre}
        triggerRef={terminal.botonCierreTriggerRef}
      />
    </div>
  );
}

export default OperadorTerminalPage;
