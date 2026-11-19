/**
 * Claves jerárquicas estables para consultas y mutaciones de TanStack Query.
 */
export const clavesApi = {
  auth: {
    todas: ['auth'] as const,
    usuario: () => [...clavesApi.auth.todas, 'usuario'] as const,
  },
  estaciones: {
    todas: ['estaciones'] as const,
    lista: () => [...clavesApi.estaciones.todas, 'lista'] as const,
    casetas: (idEstacion?: number) =>
      [...clavesApi.estaciones.todas, 'casetas', { idEstacion }] as const,
  },
  operadores: {
    todas: ['operadores'] as const,
    lista: (filtros?: { rol?: string; estado?: string; q?: string }) =>
      [...clavesApi.operadores.todas, 'lista', filtros] as const,
    detalle: (id: number) => [...clavesApi.operadores.todas, 'detalle', id] as const,
  },
  categorias: {
    todas: ['categorias'] as const,
    lista: () => [...clavesApi.categorias.todas, 'lista'] as const,
  },
  tarifas: {
    todas: ['tarifas'] as const,
    lista: (filtros?: { estacion?: number; categoria?: number; vigente?: boolean }) =>
      [...clavesApi.tarifas.todas, 'lista', filtros] as const,
  },
  vehiculos: {
    todas: ['vehiculos'] as const,
    detalle: (placa: string) =>
      [...clavesApi.vehiculos.todas, 'detalle', placa.toUpperCase()] as const,
  },
  telepeaje: {
    todas: ['telepeaje'] as const,
    cuentas: (filtros?: { estado?: string; q?: string }) =>
      [...clavesApi.telepeaje.todas, 'cuentas', filtros] as const,
    cuentaPorPlaca: (placa: string) =>
      [...clavesApi.telepeaje.todas, 'cuentaPorPlaca', placa.toUpperCase()] as const,
  },
  turnos: {
    todas: ['turnos'] as const,
    lista: (filtros?: { estado?: string; fecha?: string; estacion?: number; operador?: string }) =>
      [...clavesApi.turnos.todas, 'lista', filtros] as const,
    detalle: (id: number) => [...clavesApi.turnos.todas, 'detalle', id] as const,
    transacciones: (idTurno: number) =>
      [...clavesApi.turnos.todas, 'transacciones', idTurno] as const,
  },
  transacciones: {
    todas: ['transacciones'] as const,
  },
  auditoria: {
    todas: ['auditoria'] as const,
    lista: (filtros?: { tipo?: string; q?: string }) =>
      [...clavesApi.auditoria.todas, 'lista', filtros] as const,
  },
  recaudo: {
    todas: ['recaudo'] as const,
    resumen: (filtros?: { fecha?: string; estacion?: number }) =>
      [...clavesApi.recaudo.todas, 'resumen', filtros] as const,
  },
};
