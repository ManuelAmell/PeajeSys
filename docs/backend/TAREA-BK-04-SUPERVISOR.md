# TAREA BK-04: MODULO DE SUPERVISION, ARQUEO, AUDITORIA Y VISTAS

- **Responsable**: Alex Florez
- **Revisor**: Manuel Amell
- **Proyecto Principal**: `PeajeSys.Api`, `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-01, BK-03

---

## 1. Objetivo

Implementar los servicios y controladores para el rol de Supervisor de Estación: cálculo de arqueo y conciliación de turnos, consulta de reportes consolidados mediante vistas de PostgreSQL (`vw_resumen_diario_estacion`), trazabilidad de auditoría del sistema y diagnóstico de cuentas de telepeaje.

---

## 2. Entregables Obligatorios

1. **Servicio y Endpoint de Arqueo en `TurnosController` y `ArqueoService`**:
   - `GET /api/turnos/{id}/arqueo?efectivo_reportado=52000`:
     - Consulta el turno por su identificador.
     - Obtiene `total_recaudado_efectivo` registrado por el sistema.
     - Realiza la fórmula de conciliación estricta:
       - `diferencia = efectivo_reportado - total_recaudado_efectivo`.
       - Si `diferencia == 0`: estado `CUADRADO`.
       - Si `diferencia < 0`: estado `FALTANTE` (ej. -$500 COP).
       - Si `diferencia > 0`: estado `SOBRANTE` (ej. +$10.000 COP).
     - Retorna HTTP 200 con la estructura JSON:
       ```json
       {
         "id_turno": 9,
         "id_operador": 2,
         "id_caseta": 2,
         "efectivo_sistema": 52500,
         "efectivo_reportado": 52000,
         "diferencia": -500,
         "estado_arqueo": "FALTANTE",
         "total_vehiculos": 6
       }
       ```

2. **Reporte Consolidado Diario en `RecaudoController`**:
   - `GET /api/recaudo/diario?id_estacion=1&fecha=2026-10-06`:
     - Consulta la vista de base de datos `vw_resumen_diario_estacion`.
     - Permite filtrar por estación y rango de fechas.
     - Retorna totales de vehículos, recaudo en efectivo, recaudo en telepeaje y recaudo total combinado.

3. **Trazabilidad y Auditoría en `AuditoriaController`**:
   - `GET /api/auditoria`:
     - Consulta registros de `AUDITORIA_TRANSACCION`.
     - Permite paginación y filtros por rango de fechas, tipo de acción (`APERTURA_TURNO`, `CIERRE_TURNO`, `COBRO_PEAJE`, `MODIFICACION_TARIFA`, `RECARGA_TAG`) y usuario responsable.
     - Retorna listado ordenado cronológicamente descendente.

4. **Monitoreo de Telepeaje y Recargas en `TelepeajeController`**:
   - `GET /api/telepeaje/cuentas`:
     - Consulta la vista `vw_estado_cuentas_telepeaje`.
     - Filtra por condición de saldo (`SIN SALDO`, `SALDO CRITICO`, `SALDO SUFICIENTE`).
   - `POST /api/telepeaje/recargar`:
     - Recibe placa o serial TAG y monto a recargar.
     - Incrementa `saldo_disponible` y registra evento en la tabla de auditoría. Retorna HTTP 200.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Pruebas unitarias completas para los tres casos de arqueo: `CUADRADO`, `FALTANTE` y `SOBRANTE`.
- [ ] Verificación de lectura correcta sobre `vw_resumen_diario_estacion` mapeada en EF Core.
- [ ] Verificación de que solo usuarios con roles `SUPERVISOR` o `ADMINISTRADOR` pueden acceder a estos endpoints.
- [ ] Cero rayas largas en código o comentarios.
