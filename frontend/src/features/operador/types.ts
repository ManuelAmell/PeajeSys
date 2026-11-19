export type MetodoPagoOperador = 'EFECTIVO' | 'TELEPEAJE' | 'EXENTO';

export interface CategoriaVista {
  codigo: string;
  romano: string;
  descripcion: string;
  numero: number;
  tarifaMonto: number;
  tarifaId: number;
  tarifaTexto: string;
  deshabilitada: boolean;
  motivoDeshabilitada?: string;
  siluetaUrl: string;
}

export interface MetodoPagoConfig {
  id: MetodoPagoOperador;
  etiqueta: string;
  tecla: string;
  deshabilitado: boolean;
  motivoDeshabilitado?: string;
}

export interface OpcionRapida {
  etiqueta: string;
  valor: number;
}

export interface PasoRegistrado {
  id_transaccion?: number;
  ticket: string;
  hora: string;
  placa: string;
  categoriaRomano: string;
  metodoPago: MetodoPagoOperador;
  monto: number;
  montoTexto: string;
}

export interface AvisoExitoPaso {
  ticket: string;
  texto: string;
}
