# TAREA BK-05: MODULO DE ADMINISTRACION, TARIFAS CON VIGENCIA Y PERSONAL

- **Responsable**: Samuel Otero
- **Revisor**: Alex Florez
- **Proyecto Principal**: `PeajeSys.Api`, `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-01, BK-02

---

## 1. Objetivo

Implementar los endpoints administrativos para la gestión del catálogo de tarifas con control histórico de vigencia, la administración de personal y operadores con contraseñas seguras, la configuración de estaciones y casetas, y el catálogo de categorías vehiculares.

---

## 2. Entregables Obligatorios

1. **Gestión de Tarifas con Histórico en `TarifasController` y `TarifaService`**:
   - `GET /api/tarifas`:
     - Retorna el listado de tarifas con filtros por estación, categoría y estado de vigencia (vigentes o históricas).
   - `GET /api/tarifas/vigente?id_estacion=1&id_categoria=1`:
     - Consulta la tarifa activa donde `NOW() >= fecha_inicio_vigencia` y (`fecha_fin_vigencia IS NULL` o `NOW() <= fecha_fin_vigencia`). Retorna HTTP 200.
   - `POST /api/tarifas`:
     - Recibe: `{ "id_estacion": 1, "id_categoria": 1, "monto": 12000, "fecha_inicio_vigencia": "2026-11-19T00:00:00Z" }`.
     - **Regla Atómica de Vigencia**:
       - Dentro de una transacción de base de datos:
       - Busca la tarifa vigente previa para esa estación y categoría.
       - Si existe, actualiza su `fecha_fin_vigencia = fecha_inicio_vigencia_nueva`.
       - Inserta el nuevo registro con `fecha_fin_vigencia = NULL`.
       - Registra evento de modificación tarifaria en `AUDITORIA_TRANSACCION`.
     - Retorna HTTP 201 con la tarifa creada.

2. **Gestión de Personal en `OperadoresController`**:
   - `GET /api/operadores` y `GET /api/operadores/{id}`:
     - Consulta de operadores con filtros por rol y estado.
   - `POST /api/operadores`:
     - Valida unicidad de `codigo_empleado` y `documento_identidad`. Si ya existen, retorna HTTP 409 `OPERADOR_DUPLICADO`.
     - Genera hash seguro de la contraseña inicial con `BCrypt`.
     - Inserta el registro en `OPERADOR`. Retorna HTTP 201.
   - `PATCH /api/operadores/{id}/estado`:
     - Actualiza estado entre `ACTIVO` e `INACTIVO`. Retorna HTTP 200.

3. **Gestión de Casetas y Estaciones en `EstacionesController` y `CasetasController`**:
   - `GET /api/estaciones` y `GET /api/casetas`.
   - `PATCH /api/casetas/{id}/estado`:
     - Modifica estado de la caseta (`OPERATIVA`, `CERRADA`, `MANTENIMIENTO`).
     - Si la caseta tiene un turno abierto y se intenta marcar como `MANTENIMIENTO` o `CERRADA`, retorna advertencia o exige el cierre previo del turno.

4. **Consulta de Categorías en `CategoriasController`**:
   - `GET /api/categorias`: Retorna catálogo oficial de categorías vehiculares I a VII.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Pruebas unitarias para la lógica de actualización atómica de vigencia de tarifas.
- [ ] Pruebas de rechazo en creación de operador con código o documento duplicado (HTTP 409).
- [ ] Validación de que solo usuarios con rol `ADMINISTRADOR` pueden modificar tarifas o crear personal.
- [ ] Cero rayas largas en código o comentarios.

---

## 4. Documentos Relacionados
- [architecture.md](../architecture.md): Arquitectura en capas y componentes del sistema.
- [contrato-api-frontend.md](../contrato-api-frontend.md): Contrato técnico oficial de endpoints y payloads.
- [TAREA-BACKEND-GENERAL.md](./TAREA-BACKEND-GENERAL.md): Hoja de ruta general del equipo backend.
