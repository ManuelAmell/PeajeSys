# TAREA BK-03: MODULO DE RECAUDO EN TAQUILLA, TELEPEAJE Y GESTION DE TURNOS

- **Responsable**: Samuel Otero
- **Revisor**: Alex Florez
- **Proyecto Principal**: `PeajeSys.Api`, `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-01, BK-02

---

## 1. Objetivo

Implementar el núcleo transaccional del sistema: el procesamiento de cobros de peaje en taquilla (efectivo y telepeaje RFID), el cálculo exacto de cambio, la emisión de tiquetes fiscales con la secuencia de base de datos y el ciclo de vida de los turnos de caseta (apertura y cierre).

---

## 2. Entregables Obligatorios

1. **Gestión de Turnos en `TurnosController` y `TurnoService`**:
   - `POST /api/turnos/abrir`:
     - Recibe: `{ "id_caseta": 2, "id_operador": 2 }`.
     - Valida que la caseta no posea ya un turno `ABIERTO` (HTTP 409 `CASETA_OCUPADA`).
     - Valida que el operador no tenga otro turno `ABIERTO` en el sistema (HTTP 409 `OPERADOR_CON_TURNO_ACTIVO`).
     - Crea el registro en `TURNO` con `fecha_inicio = NOW()`, `estado = 'ABIERTO'` y contadores en 0. Retorna HTTP 201.
   - `POST /api/turnos/{id}/cerrar`:
     - Valida que el turno exista y esté `ABIERTO`. Si ya está cerrado, retorna HTTP 409 `TURNO_YA_CERRADO`.
     - Actualiza `fecha_fin = NOW()` y `estado = 'CERRADO'`. Retorna HTTP 200 con el resumen final de recaudo.
   - `GET /api/turnos` y `GET /api/turnos/{id}`:
     - Consultas con filtros por caseta, operador y estado. Retorna HTTP 200.

2. **Consulta Vehicular en `VehiculosController`**:
   - `GET /api/vehiculos/{placa}`:
     - Normaliza placa (mayúsculas, sin espacios).
     - Si el vehículo no existe en `VEHICULO`, retorna información por defecto con categoría sugerida y sin cuenta TAG.
     - Si existe y tiene cuenta en `CUENTA_TELEPEAJE`, retorna estado de la cuenta, saldo disponible y serial TAG RFID.

3. **Procesamiento Atómico de Cobro en `RecaudoController` y `CobroService`**:
   - `POST /api/recaudo/cobro`:
     - Carga útil:
       ```json
       {
         "id_turno": 9,
         "placa": "UYT890",
         "id_categoria": 1,
         "metodo_pago": "EFECTIVO",
         "efectivo_recibido": 20000
       }
       ```
     - **Regla 1 (Turno)**: Valida que el turno esté `ABIERTO`. Si está cerrado, rechaza con HTTP 409 `TURNO_CERRADO`.
     - **Regla 2 (Tarifa)**: Obtiene la tarifa vigente para la estación de la caseta y la categoría vehicular seleccionada.
     - **Regla 3 (Cobro en Efectivo)**:
       - Valida `efectivo_recibido >= tarifa`. Si es menor, retorna HTTP 422 con código `EFECTIVO_INSUFICIENTE`.
       - Calcula `cambio = efectivo_recibido - tarifa`.
     - **Regla 4 (Cobro por Telepeaje)**:
       - Consulta con bloqueo de fila (`FOR UPDATE`) la cuenta en `CUENTA_TELEPEAJE`.
       - Valida `estado_cuenta == 'ACTIVA'`. Si está inactiva, retorna HTTP 422 `CUENTA_INACTIVA`.
       - Valida `saldo_disponible >= tarifa`. Si no alcanza, retorna HTTP 422 `SALDO_INSUFICIENTE`.
       - Ejecuta el débito atómico de saldo y registra el paso en `DETALLE_PAGO_TELEPEAJE` con saldos anterior y posterior.
     - **Regla 5 (Tiquete Fiscal)**:
       - Obtiene el siguiente valor de la secuencia `seq_numero_ticket`:
         `SELECT nextval('seq_numero_ticket');`
       - Formatea el número de tiquete: `TCK-YYYYMMDD-XXXXX`.
     - **Regla 6 (Persistencia y Acumuladores)**:
       - Inserta el registro en `TRANSACCION_PEAJE`.
       - Actualiza el acumulador en `TURNO` (`total_recaudado_efectivo` para pagos en efectivo). Los totales de telepeaje y vehículos se obtienen mediante agregación o vistas (`vw_resumen_diario_estacion`).
     - Retorna HTTP 201 con el DTO de transacción exitosa.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Pruebas unitarias para cálculo de tarifas, validación de efectivo y cálculo de cambio.
- [ ] Pruebas de concurrencia simulando cobros simultáneos con bloqueo de saldo en telepeaje.
- [ ] Validación de generación de consecutivo fiscal continuo mediante la secuencia de base de datos.
- [ ] Validación de rechazo cuando se intenta cobrar con un turno cerrado (HTTP 409).
- [ ] Cero rayas largas en código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [contrato-api-frontend.md](../contrato-api-frontend.md): Contrato técnico oficial de endpoints y payloads.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
