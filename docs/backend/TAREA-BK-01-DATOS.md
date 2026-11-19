# TAREA BK-01: CAPA DE DATOS, MODELADO EF CORE Y MAPEOS DDL

- **Responsable**: Samuel Otero
- **Revisor**: Manuel Amell
- **Proyecto Principal**: `PeajeSys.Core`, `PeajeSys.Data`
- **Depende de**: BK-00

---

## 1. Objetivo

Implementar las entidades del dominio en C# y mapearlas rigurosamente contra las 11 tablas del DDL de PostgreSQL (`database/01_DDL_PeajeSys.sql`), configurando el `PeajeSysDbContext`, las restricciones de integridad mediante Fluent API y los repositorios base.

---

## 2. Entregables Obligatorios

1. **Entidades de Dominio en `PeajeSys.Core.Entities`**:
   - `EstacionPeaje`: id_estacion (PK), nombre, ubicacion_ruta, cantidad_casetas, estado.
   - `Caseta`: id_caseta (PK), id_estacion (FK), numero_caseta, sentido, tipo (enum), estado (enum).
   - `Operador`: id_operador (PK), codigo_empleado (UK), documento_identidad (UK), nombre, apellido, rol (enum), estado, password_hash.
   - `Turno`: id_turno (PK), id_caseta (FK), id_operador (FK), fecha_inicio, fecha_fin, estado (enum), total_recaudado_efectivo, total_recaudado_telepeaje, total_vehiculos.
   - `CategoriaVehiculo`: id_categoria (PK), codigo (UK), nombre, descripcion, numero_ejes.
   - `Tarifa`: id_tarifa (PK), id_categoria (FK), id_estacion (FK), monto, fecha_inicio_vigencia, fecha_fin_vigencia.
   - `Vehiculo`: placa (PK), id_categoria (FK), marca, modelo, color.
   - `CuentaTelepeaje`: id_cuenta (PK), placa_vehiculo (FK, UK), tag_rfid_serial (UK), saldo_disponible, estado_cuenta, fecha_activacion.
   - `TransaccionPeaje`: id_transaccion (PK), id_turno (FK), placa_vehiculo (FK), id_categoria (FK), monto_tarifa, metodo_pago (enum), fecha_hora, numero_ticket (UK).
   - `DetallePagoTelepeaje`: id_detalle (PK), id_transaccion (FK, UK), saldo_anterior, saldo_posterior, tag_rfid_leido.
   - `AuditoriaTransaccion`: id_auditoria (PK), id_transaccion (FK), accion, usuario_responsable, fecha_hora, detalle.

2. **Entidades para Vistas SQL de Solo Lectura (`Keyless Entity Types`)**:
   - `ResumenDiarioEstacion`: Mapeada a la vista `vw_resumen_diario_estacion`.
   - `EstadoCuentaTelepeaje`: Mapeada a la vista `vw_estado_cuentas_telepeaje`.

3. **Configuraciones Fluent API en `PeajeSys.Data.Configurations`**:
   - Implementar `IEntityTypeConfiguration<T>` para cada una de las 11 entidades.
   - Mapear nombres de tabla y columnas explícitamente en `snake_case` (ej. `.ToTable("TRANSACCION_PEAJE")`, `.Property(x => x.PlacaVehiculo).HasColumnName("placa_vehiculo")`).
   - Mapear claves primarias, claves foráneas, índices únicos (`codigo_empleado`, `numero_ticket`, `tag_rfid_serial`) y restricciones `CHECK`.
   - Configurar la secuencia fiscal `seq_numero_ticket` en el modelo.

4. **PeajeSysDbContext y Repositorio Base**:
   - Registro de `DbSet<T>` para todas las entidades y vistas.
   - Configuración de `Npgsql.EntityFrameworkCore.PostgreSQL` con reintentos (`EnableRetryOnFailure`).
   - Interfaz e implementación de `IRepository<T>` y `IUnitOfWork` para manejo transaccional de operaciones.

---

## 3. Criterios de Aceptación y Pruebas

- [ ] Todas las 11 entidades y 2 vistas están creadas y mapeadas sin discrepancias respecto al script `01_DDL_PeajeSys.sql`.
- [ ] La prueba de inicialización del `DbContext` contra una base de prueba en PostgreSQL se ejecuta con éxito.
- [ ] Las consultas de prueba de lectura sobre `OPERADOR`, `TURNO` y `vw_resumen_diario_estacion` devuelven datos válidos.
- [ ] Cero rayas largas en código o comentarios.
