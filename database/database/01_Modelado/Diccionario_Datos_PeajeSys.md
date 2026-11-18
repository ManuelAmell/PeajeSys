# Diccionario de Datos Oficial: PeajeSys
**Asignatura:** Bases de Datos (2026-2) — Universidad de Cartagena  
**Docente:** Víctor Valdelamar  
**Proyecto:** PeajeSys (Sistema Integral de Control, Facturación y Recaudación de Peajes Viales)  
**Equipo:** Camilo Guzmán, Samuel Otero, Alex Flórez, Manuel Amell  

---

## 1. Módulo de Infraestructura y Operación

### 1.1 Tabla: `ESTACION_PEAJE`
* **Descripción:** Almacena las sedes o peajes físicos operados por la concesión vial.
* **Clave Primaria:** `id_estacion`

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_estacion` | SERIAL | NO | PRIMARY KEY | Identificador único subrogado de la estación. |
| `nombre` | VARCHAR(100) | NO | | Nombre comercial del peaje (ej. 'Estación Gambote'). |
| `codigo_estacion`| VARCHAR(20) | NO | UNIQUE | Código regulatorio asignado por Mintransporte/ANI. |
| `ubicacion_geografica` | VARCHAR(255) | NO | | Dirección o abscisado kilométrico (ej. 'Km 25 Vía Gambote'). |
| `sentido_via` | VARCHAR(50) | NO | | Orientación del flujo (ej. 'BOGOTA-CARTAGENA'). |
| `estado` | VARCHAR(20) | NO | DEFAULT 'ACTIVA', CHECK in ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO') | Estado operativo de la estación. |
| `created_at` | TIMESTAMPTZ | NO | DEFAULT NOW() | Marca temporal de registro en el sistema. |

---

### 1.2 Tabla: `CASETA`
* **Descripción:** Carriles de cobro individuales ubicados en una estación de peaje.
* **Clave Primaria:** `id_caseta`
* **Claves Foráneas:** `id_estacion` -> `ESTACION_PEAJE(id_estacion)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_caseta` | SERIAL | NO | PRIMARY KEY | Identificador único de la caseta/carril. |
| `id_estacion` | INT | NO | FK a `ESTACION_PEAJE` | Estación a la que pertenece físicamente el carril. |
| `numero_carril`| INT | NO | CHECK (numero_carril > 0) | Número secuencial del carril en la estación. |
| `tipo_carril` | VARCHAR(30) | NO | CHECK in ('MANUAL', 'TELEPEAJE_EXCLUSIVO', 'MIXTO') | Modalidad operativa de cobro permitida en el carril. |
| `estado` | VARCHAR(20) | NO | DEFAULT 'OPERATIVA', CHECK in ('OPERATIVA', 'CERRADA', 'MANTENIMIENTO') | Estado operativo del carril. |

*Restricción de Unicidad Compuesta:* `UNIQUE (id_estacion, numero_carril)`

---

### 1.3 Tabla: `OPERADOR`
* **Descripción:** Personal de recaudación física (cajeros) y supervisores viales.
* **Clave Primaria:** `id_operador`

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_operador` | SERIAL | NO | PRIMARY KEY | Identificador único del funcionario. |
| `numero_documento` | VARCHAR(20) | NO | UNIQUE | Cédula de ciudadanía o documento de identidad. |
| `nombres` | VARCHAR(100) | NO | | Nombres del empleado. |
| `apellidos` | VARCHAR(100) | NO | | Apellidos del empleado. |
| `codigo_empleado` | VARCHAR(20) | NO | UNIQUE | Código interno corporativo de nómina. |
| `rol` | VARCHAR(30) | NO | CHECK in ('RECAUDADOR', 'SUPERVISOR') | Perfil funcional en la caseta. |
| `estado` | VARCHAR(20) | NO | DEFAULT 'ACTIVO', CHECK in ('ACTIVO', 'INACTIVO') | Estado del contrato laboral. |

---

### 1.4 Tabla: `TURNO`
* **Descripción:** Jornada operativa asignada a un operador en una caseta determinada.
* **Clave Primaria:** `id_turno`
* **Claves Foráneas:**
  - `id_caseta` -> `CASETA(id_caseta)` ON DELETE RESTRICT
  - `id_operador` -> `OPERADOR(id_operador)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_turno` | BIGSERIAL | NO | PRIMARY KEY | Identificador único del turno. |
| `id_caseta` | INT | NO | FK a `CASETA` | Carril donde se realiza la atención. |
| `id_operador` | INT | NO | FK a `OPERADOR` | Cajero responsable del dinero en efectivo. |
| `fecha` | DATE | NO | DEFAULT CURRENT_DATE | Fecha de apertura de la jornada. |
| `diurno` | BOOLEAN | NO | DEFAULT TRUE | TRUE para turno diurno, FALSE para nocturno. |
| `fondo_inicial_caja` | NUMERIC(12,2) | NO | DEFAULT 0.00, CHECK (>= 0) | Base de cambio asignada al inicio del turno. |
| `total_recaudado_efectivo` | NUMERIC(12,2) | SÍ | DEFAULT 0.00, CHECK (>= 0) | Acumulador del sistema de cobros en efectivo. |
| `total_declarado_cierre` | NUMERIC(12,2) | SÍ | CHECK (>= 0) | Efectivo físico reportado por el cajero en el arqueo. |
| `diferencia_descuadre` | NUMERIC(12,2) | SÍ | | Diferencia monetaria (declarado - recaudo sistema). |
| `estado` | VARCHAR(20) | NO | DEFAULT 'ABIERTO', CHECK in ('ABIERTO', 'CERRADO') | Estado operativo del turno. |

---

## 2. Módulo de Vehículos, Categorías y Tarifas

### 2.1 Tabla: `CATEGORIA_VEHICULO`
* **Descripción:** Clasificación oficial del Ministerio de Transporte de Colombia para cobro de peajes.
* **Clave Primaria:** `id_categoria`

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_categoria` | SERIAL | NO | PRIMARY KEY | Identificador de la categoría. |
| `codigo` | VARCHAR(10) | NO | UNIQUE | Código oficial (ej. 'CAT_I', 'CAT_II', ..., 'CAT_VII'). |
| `descripcion` | VARCHAR(150) | NO | | Tipología (ej. 'Automóviles, camperos y camionetas'). |
| `numero_ejes_min` | INT | NO | CHECK (>= 1) | Límite inferior de ejes mecánicos. |
| `numero_ejes_max` | INT | NO | | Límite superior de ejes mecánicos. |
| `peso_maximo_ton` | NUMERIC(6,2) | SÍ | CHECK (> 0) | Peso bruto vehicular máximo permitido. |
| `activo` | BOOLEAN | NO | DEFAULT TRUE | Habilitación de la categoría. |

*Restricción de Dominio:* `CHECK (numero_ejes_max >= numero_ejes_min)`

---

### 2.2 Tabla: `TARIFA`
* **Descripción:** Desacopla la relación N:M entre Estación y Categoría, fijando el precio legal vigente.
* **Clave Primaria:** `id_tarifa`
* **Claves Foráneas:**
  - `id_estacion` -> `ESTACION_PEAJE(id_estacion)` ON DELETE RESTRICT
  - `id_categoria` -> `CATEGORIA_VEHICULO(id_categoria)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_tarifa` | SERIAL | NO | PRIMARY KEY | Identificador de la tarifa. |
| `id_estacion` | INT | NO | FK a `ESTACION_PEAJE` | Peaje donde aplica la tarifa. |
| `id_categoria` | INT | NO | FK a `CATEGORIA_VEHICULO`| Categoría gravada. |
| `monto` | NUMERIC(10,2) | NO | CHECK (monto > 0) | Importe a pagar en pesos colombianos ($ COP). |
| `resolucion_legal`| VARCHAR(100) | SÍ | | Acto administrativo habilitante de Mintransporte/ANI. |
| `fecha_inicio_vigencia` | DATE | NO | | Fecha en que entra a regir el valor. |
| `fecha_fin_vigencia` | DATE | SÍ | | Fecha de caducidad o actualización tarifaria. |
| `activa` | BOOLEAN | NO | DEFAULT TRUE | Indicador booleano de vigencia operativa. |

*Restricción de Fechas:* `CHECK (fecha_fin_vigencia IS NULL OR fecha_fin_vigencia >= fecha_inicio_vigencia)`

---

### 2.3 Tabla: `VEHICULO`
* **Descripción:** Registro del padrón vehicular nacional identificado por placa única.
* **Clave Primaria:** `placa`
* **Claves Foráneas:** `id_categoria` -> `CATEGORIA_VEHICULO(id_categoria)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `placa` | VARCHAR(10) | NO | PRIMARY KEY | Placa alfanumérica única nacional (ej. 'HKL123'). |
| `id_categoria` | INT | NO | FK a `CATEGORIA_VEHICULO` | Categoría vehicular asignada. |
| `marca` | VARCHAR(50) | SÍ | | Marca del fabricante (ej. 'Mazda'). |
| `modelo` | VARCHAR(50) | SÍ | | Línea/modelo del automotor (ej. 'CX-5'). |
| `color` | VARCHAR(30) | SÍ | | Color del vehículo. |

---

### 2.4 Tabla: `CUENTA_TELEPEAJE`
* **Descripción:** Cuenta prepago asociada al TAG RFID de parabrisas para cobro sin contacto.
* **Clave Primaria:** `id_cuenta`
* **Claves Foráneas:** `placa_vehiculo` -> `VEHICULO(placa)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_cuenta` | BIGSERIAL | NO | PRIMARY KEY | Identificador de la cuenta prepago. |
| `placa_vehiculo` | VARCHAR(10) | NO | UNIQUE, FK a `VEHICULO` | Vehículo titular de la cuenta (Relación 1:1). |
| `tag_rfid_serial` | VARCHAR(64) | NO | UNIQUE | Serial alfanumérico grabado en el chip RFID. |
| `saldo_disponible` | NUMERIC(12,2) | NO | DEFAULT 0.00, CHECK (>= 0) | Saldo prepago en pesos colombianos. |
| `estado_cuenta` | VARCHAR(20) | NO | DEFAULT 'ACTIVA', CHECK in ('ACTIVA', 'SUSPENDIDA') | Estado administrativo de la cuenta. |

---

## 3. Módulo Transaccional, Conciliación y Auditoría

### 3.1 Tabla: `TRANSACCION_PEAJE`
* **Descripción:** Entidad central de alta concurrencia donde se registra cada paso vehicular.
* **Clave Primaria:** `id_transaccion`
* **Claves Foráneas:**
  - `id_turno` -> `TURNO(id_turno)` ON DELETE RESTRICT
  - `id_tarifa` -> `TARIFA(id_tarifa)` ON DELETE RESTRICT
  - `id_categoria` -> `CATEGORIA_VEHICULO(id_categoria)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_transaccion` | BIGSERIAL | NO | PRIMARY KEY | Consecutivo global de la transacción. |
| `id_turno` | BIGINT | NO | FK a `TURNO` | Turno de atención en caseta. |
| `id_tarifa` | INT | NO | FK a `TARIFA` | Tarifa exacta aplicada al cobro. |
| `id_categoria` | INT | NO | FK a `CATEGORIA_VEHICULO` | Categoría identificada en el paso. |
| `placa_detectada` | VARCHAR(10) | SÍ | | Placa leída por OCR o ingresada por cajero. |
| `monto_tarifa` | NUMERIC(10,2) | NO | CHECK (monto_tarifa >= 0) | Valor liquidado y cobrado. |
| `metodo_pago` | VARCHAR(20) | NO | CHECK in ('EFECTIVO', 'TELEPEAJE', 'EXENTO') | Medio de pago utilizado. |
| `numero_ticket` | VARCHAR(40) | NO | UNIQUE | Consecutivo fiscal único emitido. |
| `fecha_hora` | TIMESTAMPTZ | NO | DEFAULT NOW() | Estampa cronológica precisa con zona horaria. |
| `estado_paso` | VARCHAR(20) | NO | DEFAULT 'APROBADO', CHECK in ('APROBADO', 'EVASION', 'EXENTO') | Calificación del paso vehicular. |

---

### 3.2 Tabla: `DETALLE_PAGO_TELEPEAJE`
* **Descripción:** Auditoría y conciliación financiera 1 a 1 de las transacciones cobradas por RFID.
* **Clave Primaria:** `id_detalle_telepeaje`
* **Claves Foráneas:**
  - `id_transaccion` -> `TRANSACCION_PEAJE(id_transaccion)` ON DELETE RESTRICT (UNIQUE)
  - `id_cuenta` -> `CUENTA_TELEPEAJE(id_cuenta)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_detalle_telepeaje` | BIGSERIAL | NO | PRIMARY KEY | Identificador único del detalle. |
| `id_transaccion` | BIGINT | NO | UNIQUE, FK a `TRANSACCION_PEAJE` | Transacción de peaje asociada. |
| `id_cuenta` | BIGINT | NO | FK a `CUENTA_TELEPEAJE` | Cuenta prepago debitada. |
| `saldo_anterior` | NUMERIC(12,2) | NO | CHECK (>= 0) | Saldo disponible antes del paso. |
| `saldo_posterior`| NUMERIC(12,2) | NO | CHECK (>= 0) | Saldo disponible resultante tras el cobro. |
| `antena_lectora_id` | VARCHAR(30) | SÍ | | Identificador físico de hardware de la antena RFID. |

---

### 3.3 Tabla: `AUDITORIA_TRANSACCION`
* **Descripción:** Bitácora inmutable (Append-Only) para eventos de seguridad, modificaciones y evasiones.
* **Clave Primaria:** `id_auditoria`
* **Claves Foráneas:** `id_transaccion` -> `TRANSACCION_PEAJE(id_transaccion)` ON DELETE RESTRICT

| Columna | Tipo de Dato | Nulo | Restricciones / Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id_auditoria` | BIGSERIAL | NO | PRIMARY KEY | Consecutivo de la traza de auditoría. |
| `id_transaccion` | BIGINT | NO | FK a `TRANSACCION_PEAJE` | Transacción auditada. |
| `tipo_operacion` | VARCHAR(20) | NO | CHECK in ('INSERT', 'UPDATE', 'VOID') | Tipo de acción registrada. |
| `usuario_sistema`| VARCHAR(50) | NO | | Usuario de base de datos o sistema que originó el evento. |
| `fecha_hora_evento` | TIMESTAMPTZ | NO | DEFAULT NOW() | Fecha y hora exacta del suceso. |
| `motivo` | VARCHAR(255) | SÍ | | Descripción o justificación técnica del evento auditado. |

*Garantía de Inmutabilidad:* Protegida contra `UPDATE` y `DELETE` mediante el disparador `trg_auditoria_inmutable`.
