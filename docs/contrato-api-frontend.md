# Contrato de API Frontend PeajeSys

Este documento define la interfaz de integración HTTP entre el cliente web (frontend) y la API REST de PeajeSys. Ha sido diseñado a partir del modelo relacional DDL PostgreSQL, los datos semilla del DML y la lógica de interacción de los prototipos interactivos Claude Design.

El servidor simulado de desarrollo (MSW v2) implementa este contrato de forma idéntica, permitiendo el desacoplamiento total del frontend respecto a la disponibilidad del backend.

---

## 1. Convenciones Generales

### 1.1 Formato de Intercambio
- **Codificación**: UTF-8.
- **Content-Type**: `application/json` en todas las peticiones y respuestas con cuerpo.
- **Ruta base**: `/api`. En desarrollo, el Service Worker de MSW intercepta estas rutas; en producción o integración se configura mediante la variable de entorno `VITE_API_BASE_URL`.

### 1.2 Tipos de Datos y Serialización
- **Identificadores**: Números enteros positivos (`number`), coincidentes con claves primarias `SERIAL` / `INTEGER` del DDL.
- **Importes monetarios**: Números en pesos colombianos (`COP`), representados como `number` positivos o no negativos. Se redondean a cifras enteras sin decimales en caja.
- **Fechas simples**: Cadena en formato ISO 8601 simple `YYYY-MM-DD` (ej. `'2026-03-01'`).
- **Marcas temporales (Timestamps)**: Cadena en formato ISO 8601 extendido con zona horaria `YYYY-MM-DDTHH:mm:ss.sssZ` (ej. `'2026-03-01T08:00:00.000Z'`).
- **Booleans**: Valores primitivos booleanos `true` o `false`.
- **Cadenas de texto**: Texto normalizado sin espacios sobrantes al inicio o fin (`trim()`). Las placas de vehículos se manejan en mayúsculas sin guiones ni espacios intermedios (ej. `'HKL123'`).

### 1.3 Formato Estándar de Error
Todas las respuestas de error (códigos HTTP 4xx y 5xx) retornan una carga útil uniforme:

```json
{
  "error": {
    "codigo": "CODIGO_ERROR_MAYUSCULAS",
    "mensaje": "Descripción legible en español del problema ocurrido.",
    "campos": {
      "nombre_campo": "Mensaje de validación específico asociado al campo."
    }
  }
}
```

El campo `campos` es opcional y se incluye cuando el error se debe a fallas de validación de formulario o restricciones del modelo de datos.

### 1.4 Códigos de Estado HTTP Utilizados

| Código HTTP | Significado | Escenario en PeajeSys |
|---|---|---|
| 200 OK | Éxito | Consultas GET y mutaciones PATCH/POST que devuelven el recurso actualizado. |
| 201 Created | Creado | Creación de operadores, categorías, tarifas o registro de transacciones. |
| 204 No Content | Sin Contenido | Operaciones exitosas sin cuerpo de retorno. |
| 400 Bad Request | Petición Inválida | Cuerpo JSON mal formado o ausencia de parámetros requeridos no asociados a campos específicos. |
| 401 Unauthorized | No Autenticado | Petición que requiere sesión activa o token válido. |
| 403 Forbidden | No Autorizado | Usuario autenticado pero con estado inactivo o permisos insuficientes. |
| 404 Not Found | No Encontrado | Recurso solicitado inexistente (turno, operador, placa de vehículo, tarifa). |
| 409 Conflict | Conflicto | Intento de registrar un recurso duplicado o cambio de estado no permitido (cierre de un turno ya cerrado, cobro en turno cerrado, login de recaudador sin turno abierto asignado). |
| 422 Unprocessable | Error de Validación | Violación de restricciones CHECK del DDL, saldo insuficiente en telepeaje, efectivo menor a la tarifa o formato incorrecto de campos. |
| 500 Server Error | Error del Servidor | Error no controlado o simulación forzada con `?mock=error`. |

---

## 2. Parámetros Especiales de Simulación en Desarrollo (MSW)

Cualquier endpoint puede recibir el parámetro de consulta `mock` para forzar comportamientos deterministas en pruebas manuales y flujos de interfaz:

- `?mock=vacio`: El endpoint responde exitosamente (HTTP 200) con listas vacías `[]` o estructuras con recuentos en cero.
- `?mock=error`: El endpoint responde forzosamente con HTTP 500 y un JSON de error de servidor simulado.
- `?mock=lento`: El endpoint introduce una latencia artificial de 2000 milisegundos antes de responder con los datos normales, permitiendo validar estados de carga (`Skeleton`, `Spinner`).

En condiciones normales sin el parámetro `mock`, en navegador MSW introduce una latencia realista aleatoria de 50 a 150 ms, mientras que en entorno de pruebas unitarias (Vitest) la latencia es estrictamente de 0 ms para garantizar máxima velocidad.

---

## 3. Catálogo de Endpoints

### 3.1 Autenticación

#### POST /api/auth/login
Valida credenciales de acceso para recaudadores, supervisores y administradores.

- **Cuerpo de la petición**:
```json
{
  "codigo": "EMP-001",
  "clave": "Turno123*"
}
```
- **Respuesta 200 OK (Recaudador con turno abierto)**:
```json
{
  "usuario": {
    "id": "1",
    "codigo": "EMP-001",
    "nombre": "Carlos Alberto",
    "nombre_completo": "Carlos Alberto Gómez Restrepo",
    "rol": "RECAUDADOR",
    "rolTxt": "Recaudador",
    "destino": "/operador",
    "destinoTxt": "Ir a la terminal de cobro (turno 8)"
  },
  "turno_abierto": {
    "id_turno": 8,
    "id_caseta": 1,
    "numero_carril": 1,
    "tipo_carril": "MANUAL",
    "id_estacion": 1,
    "estacion_nombre": "Estación Gambote",
    "fecha": "2026-03-01",
    "diurno": true,
    "fondo_inicial_caja": 200000,
    "total_recaudado_efectivo": 10500
  }
}
```
- **Respuesta 200 OK (Supervisor o Admin)**:
```json
{
  "usuario": {
    "id": "3",
    "codigo": "EMP-003",
    "nombre": "Juan David",
    "nombre_completo": "Juan David Rodríguez Silva",
    "rol": "SUPERVISOR",
    "rolTxt": "Supervisor",
    "destino": "/supervisor",
    "destinoTxt": "Ir al panel del supervisor"
  }
}
```
- **Errores posibles**:
  - `400 Bad Request` (`CODIGO_REQUERIDO`, `CLAVE_REQUERIDA`).
  - `404 Not Found` (`EMPLEADO_NO_ENCONTRADO`): Código no registrado en el sistema.
  - `403 Forbidden` (`EMPLEADO_INACTIVO`): Operador con estado `INACTIVO`.
  - `409 Conflict` (`SIN_TURNO_ABIERTO`): Recaudador activo sin turno asignado.

---

### 3.2 Estaciones y Casetas

#### GET /api/estaciones
Obtiene la lista de todas las estaciones de peaje.

- **Parámetros**: Ninguno.
- **Respuesta 200 OK**:
```json
[
  {
    "id_estacion": 1,
    "nombre": "Estación Gambote",
    "codigo_estacion": "EST-01",
    "ubicacion_geografica": "Km 45 Vía al Mar",
    "sentido_via": "NORTE-SUR",
    "estado": "ACTIVA",
    "created_at": "2026-01-01T00:00:00Z"
  },
  {
    "id_estacion": 2,
    "nombre": "Estación Turbaco",
    "codigo_estacion": "EST-02",
    "ubicacion_geografica": "Km 12 Variante Turbaco",
    "sentido_via": "SUR-NORTE",
    "estado": "ACTIVA",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

#### GET /api/casetas
Obtiene las casetas o carriles de peaje, opcionalmente filtradas por estación.

- **Parámetros de consulta**: `estacion` o `id_estacion` (`number`, opcional).
- **Respuesta 200 OK**:
```json
[
  {
    "id_caseta": 1,
    "id_estacion": 1,
    "numero_carril": 1,
    "tipo_carril": "MANUAL",
    "estado": "OPERATIVA"
  },
  {
    "id_caseta": 2,
    "id_estacion": 1,
    "numero_carril": 2,
    "tipo_carril": "MIXTO",
    "estado": "OPERATIVA"
  }
]
```

---

### 3.3 Operadores

#### GET /api/operadores
Lista los empleados con soporte para filtros combinados.

- **Parámetros de consulta**:
  - `rol` (`RECAUDADOR` | `SUPERVISOR`, opcional)
  - `estado` (`ACTIVO` | `INACTIVO`, opcional)
  - `q` (`string`, opcional): Búsqueda por coincidencia en código, nombre o documento.
- **Respuesta 200 OK**: Array de objetos `Operador`.

#### GET /api/operadores/:id
Obtiene el detalle de un operador por su identificador primario.

- **Respuesta 200 OK**: Objeto `Operador`.
- **Errores posibles**: `404 Not Found` (`OPERADOR_NO_ENCONTRADO`).

#### POST /api/operadores
Crea un nuevo operador en el sistema.

- **Cuerpo de la petición**:
```json
{
  "numero_documento": "1047123456",
  "nombres": "Carlos Alberto",
  "apellidos": "Gómez Restrepo",
  "codigo_empleado": "EMP-001",
  "rol": "RECAUDADOR",
  "estado": "ACTIVO"
}
```
- **Respuesta 201 Created**: Objeto `Operador` con su `id_operador` asignado.
- **Errores posibles**:
  - `409 Conflict` (`DOCUMENTO_DUPLICADO`, `CODIGO_DUPLICADO`).
  - `422 Unprocessable` (`ERROR_VALIDACION`): Campos fuera de límites VARCHAR o rol/estado inválidos.

#### PATCH /api/operadores/:id
Actualiza atributos parciales de un operador (estado, nombres, apellidos, rol).

- **Respuesta 200 OK**: Objeto `Operador` actualizado.
- **Errores posibles**: `404 Not Found`, `422 Unprocessable`.

---

### 3.4 Categorías de Vehículo

#### GET /api/categorias
Obtiene las categorías vehiculares activas e inactivas.

- **Respuesta 200 OK**: Array de objetos `CategoriaVehiculo`. Ejemplo:
```json
[
  {
    "id_categoria": 1,
    "codigo": "CAT_I",
    "descripcion": "Automóviles, camperos y camionetas",
    "numero_ejes_min": 2,
    "numero_ejes_max": 2,
    "peso_maximo_ton": 3.5,
    "activo": true
  }
]
```

#### POST /api/categorias
Crea una nueva categoría vehicular garantizando `chk_ejes_valido`.

- **Cuerpo de la petición**:
```json
{
  "codigo": "CAT_VIII",
  "descripcion": "Vehículos especiales de carga pesada",
  "numero_ejes_min": 6,
  "numero_ejes_max": 12,
  "peso_maximo_ton": 60.0,
  "activo": true
}
```
- **Respuesta 201 Created**: Objeto `CategoriaVehiculo` creado.
- **Errores posibles**: `422 Unprocessable` si `numero_ejes_max < numero_ejes_min`.

#### PATCH /api/categorias/:id
Actualiza propiedades de una categoría vehicular.

- **Respuesta 200 OK**: Objeto `CategoriaVehiculo` actualizado.

---

### 3.5 Tarifas

#### GET /api/tarifas
Lista tarifas configuradas con soporte de filtros.

- **Parámetros de consulta**:
  - `estacion` (`number`, opcional)
  - `categoria` (`number`, opcional)
  - `vigente` (`boolean`, opcional)
- **Respuesta 200 OK**: Array de objetos `Tarifa`.

#### POST /api/tarifas
Registra una nueva tarifa para una estación y categoría.

- **Cuerpo de la petición**:
```json
{
  "id_estacion": 1,
  "id_categoria": 1,
  "monto": 10500,
  "resolucion_legal": "Res. MinTransporte 0045/2026",
  "fecha_inicio_vigencia": "2026-01-01",
  "fecha_fin_vigencia": null,
  "activa": true
}
```
- **Respuesta 201 Created**: Objeto `Tarifa`.
- **Errores posibles**:
  - `422 Unprocessable` (`chk_fechas_vigencia` si `fecha_fin < fecha_inicio`, o monto menor o igual a cero).

#### PATCH /api/tarifas/:id
Actualiza monto, resolución o vigencia de una tarifa.

- **Respuesta 200 OK**: Objeto `Tarifa` actualizado.

---

### 3.6 Vehículos y Telepeaje

#### GET /api/vehiculos/:placa
Consulta los datos de un vehículo por su placa y verifica si posee cuenta de telepeaje asociada.

- **Parámetros de ruta**: `placa` (cadena alfanumérica normalizada).
- **Respuesta 200 OK**:
```json
{
  "vehiculo": {
    "placa": "HKL123",
    "id_categoria": 1,
    "marca": "Mazda",
    "modelo": "CX-5",
    "color": "Gris"
  },
  "cuenta": {
    "id_cuenta": 1,
    "placa_vehiculo": "HKL123",
    "tag_rfid_serial": "TAG-COL-9900112233",
    "saldo_disponible": 150000,
    "estado_cuenta": "ACTIVA"
  }
}
```
- **Errores posibles**: `404 Not Found` (`VEHICULO_NO_ENCONTRADO`).

#### GET /api/cuentas-telepeaje
Lista todas las cuentas de telepeaje con filtros opcionales de estado o texto de búsqueda.

- **Parámetros de consulta**: `estado` (`ACTIVA` | `SUSPENDIDA`), `q` (búsqueda por placa o serial TAG).
- **Respuesta 200 OK**: Array de objetos `CuentaTelepeaje`.

#### GET /api/cuentas-telepeaje/por-placa/:placa
Obtiene la cuenta de telepeaje directamente vinculada a una placa vehicular.

- **Respuesta 200 OK**: Objeto `CuentaTelepeaje`.
- **Errores posibles**: `404 Not Found` (`CUENTA_NO_ENCONTRADA`).

---

### 3.7 Turnos de Recaudo

#### GET /api/turnos
Lista turnos de trabajo con filtros por estado, fecha, estación y operador.

- **Parámetros de consulta**: `estado` (`ABIERTO` | `CERRADO`), `fecha`, `estacion`, `operador`.
- **Respuesta 200 OK**: Array de objetos `Turno`.

#### GET /api/turnos/:id
Obtiene el estado detallado de un turno.

- **Respuesta 200 OK**:
```json
{
  "id_turno": 8,
  "id_caseta": 1,
  "id_operador": 1,
  "fecha": "2026-03-01",
  "diurno": true,
  "fondo_inicial_caja": 200000,
  "total_recaudado_efectivo": 10500,
  "total_declarado_cierre": null,
  "diferencia_descuadre": null,
  "estado": "ABIERTO"
}
```
- **Errores posibles**: `404 Not Found` (`TURNO_NO_ENCONTRADO`).

#### GET /api/turnos/:id/transacciones
Lista las transacciones registradas dentro de un turno específico.

- **Respuesta 200 OK**: Array de objetos `TransaccionPeaje`.

#### POST /api/turnos/:id/cierre
Efectúa el cierre de caja de un turno, contrastando el dinero físico declarado con el recaudo registrado por el sistema para calcular la diferencia de descuadre.

- **Cuerpo de la petición**:
```json
{
  "total_declarado_cierre": 10000
}
```
- **Respuesta 200 OK**:
```json
{
  "id_turno": 9,
  "id_caseta": 2,
  "id_operador": 2,
  "fecha": "2026-03-01",
  "diurno": true,
  "fondo_inicial_caja": 200000,
  "total_recaudado_efectivo": 10500,
  "total_declarado_cierre": 10000,
  "diferencia_descuadre": -500,
  "estado": "CERRADO"
}
```
- **Errores posibles**:
  - `404 Not Found` (`TURNO_NO_ENCONTRADO`).
  - `409 Conflict` (`TURNO_YA_CERRADO`): El turno ya se encontraba cerrado.
  - `422 Unprocessable` (`ERROR_VALIDACION`): Declarado menor que 0 o formato numérico inválido.

---

### 3.8 Transacciones de Peaje

#### POST /api/transacciones
Registra el paso vehicular y cobro en una caseta de peaje.

- **Cuerpo de la petición (Cobro en Efectivo)**:
```json
{
  "id_turno": 8,
  "id_tarifa": 1,
  "id_categoria": 1,
  "placa_detectada": "HKL123",
  "monto_tarifa": 10500,
  "metodo_pago": "EFECTIVO",
  "numero_ticket": "TK-20260301-01-00101",
  "estado_paso": "APROBADO",
  "recibido": 20000,
  "usuario_sistema": "carlos_gomez"
}
```
- **Cuerpo de la petición (Cobro por Telepeaje TAG)**:
```json
{
  "id_turno": 8,
  "id_tarifa": 1,
  "id_categoria": 1,
  "placa_detectada": "HKL123",
  "monto_tarifa": 10500,
  "metodo_pago": "TELEPEAJE",
  "numero_ticket": "TK-20260301-01-00102",
  "estado_paso": "APROBADO",
  "usuario_sistema": "sistema_antena"
}
```
- **Respuesta 201 Created**:
```json
{
  "transaccion": {
    "id_transaccion": 101,
    "id_turno": 8,
    "id_tarifa": 1,
    "id_categoria": 1,
    "placa_detectada": "HKL123",
    "monto_tarifa": 10500,
    "metodo_pago": "EFECTIVO",
    "numero_ticket": "TK-20260301-01-00101",
    "fecha_hora": "2026-03-01T08:15:30.000Z",
    "estado_paso": "APROBADO"
  },
  "cambio": 9500,
  "saldo_posterior": null,
  "detalle_telepeaje": null
}
```
- **Errores posibles**:
  - `404 Not Found` (`TURNO_NO_ENCONTRADO`, `CUENTA_NO_ENCONTRADA`).
  - `409 Conflict` (`TURNO_CERRADO`): No se puede cobrar en un turno cerrado.
  - `422 Unprocessable`:
    - `EFECTIVO_INSUFICIENTE`: El dinero entregado no cubre el peaje.
    - `SALDO_INSUFICIENTE`: La cuenta de telepeaje no tiene fondos suficientes.
    - `CUENTA_SUSPENDIDA`: La cuenta TAG está inhabilitada.

#### POST /api/transacciones/:id/anulacion
Anula una transacción de peaje registrada por error y añade una entrada inmutable en la tabla de auditoría con tipo de operación `VOID`.

- **Cuerpo de la petición**:
```json
{
  "motivo": "Cobro de categoría errónea digitado por el recaudador",
  "usuario_sistema": "juan_supervisor"
}
```
- **Respuesta 200 OK**:
```json
{
  "transaccion": {
    "id_transaccion": 101,
    "id_turno": 8,
    "id_tarifa": 1,
    "id_categoria": 1,
    "placa_detectada": "HKL123",
    "monto_tarifa": 0,
    "metodo_pago": "EFECTIVO",
    "numero_ticket": "TK-20260301-01-00101",
    "fecha_hora": "2026-03-01T08:15:30.000Z",
    "estado_paso": "EXENTO"
  },
  "auditoria": {
    "id_auditoria": 51,
    "id_transaccion": 101,
    "tipo_operacion": "VOID",
    "usuario_sistema": "juan_supervisor",
    "fecha_hora_evento": "2026-03-01T08:16:00.000Z",
    "motivo": "Cobro de categoría errónea digitado por el recaudador"
  }
}
```
- **Errores posibles**:
  - `404 Not Found` (`TRANSACCION_NO_ENCONTRADA`).
  - `422 Unprocessable` (`MOTIVO_REQUERIDO`): Es obligatorio registrar el motivo en auditoría.

---

### 3.9 Auditoría y Recaudo

#### GET /api/auditoria
Consulta la bitácora inmutable de eventos del sistema peaje.

- **Parámetros de consulta**: `tipo` (`INSERT` | `UPDATE` | `VOID`), `q` (búsqueda de texto en motivo o usuario).
- **Respuesta 200 OK**: Array de objetos `AuditoriaTransaccion`.

#### GET /api/recaudo
Obtiene agregados consolidados de recaudo agrupados por fecha y por carril.

- **Parámetros de consulta**: `fecha` (`YYYY-MM-DD`, opcional), `estacion` (`number`, opcional).
- **Respuesta 200 OK**:
```json
{
  "total_efectivo": 1250000,
  "total_telepeaje": 850000,
  "total_general": 2100000,
  "dias": [
    {
      "fecha": "2026-03-01",
      "veh": 142,
      "ef": 1250000,
      "tag": 850000,
      "total": 2100000
    }
  ],
  "carriles": [
    {
      "id_caseta": 1,
      "numero_carril": 1,
      "tipo_carril": "MANUAL",
      "veh": 85,
      "ef": 1250000,
      "tag": 0,
      "total": 1250000
    },
    {
      "id_caseta": 2,
      "numero_carril": 2,
      "tipo_carril": "MIXTO",
      "veh": 57,
      "ef": 0,
      "tag": 850000,
      "total": 850000
    }
  ]
}
```

---

## 4. Matriz de Correspondencia DDL ↔ TypeScript ↔ Zod ↔ Restricciones CHECK

| Tabla DDL | Tipo TypeScript | Esquema Zod | Restricción CHECK del DDL | Implementación y Regla de Validación |
|---|---|---|---|---|
| `ESTACION_PEAJE` | `EstacionPeaje` | `esquemaEstacionPeaje` | `chk_estado_estacion` | `z.enum(['ACTIVA', 'INACTIVA', 'MANTENIMIENTO'])` |
| `CASETA` | `Caseta` | `esquemaCaseta` | `chk_tipo_carril`, `chk_estado_caseta`, `numero_carril > 0` | `z.enum(['MANUAL', 'TELEPEAJE_EXCLUSIVO', 'MIXTO'])`, `z.enum(['OPERATIVA', 'CERRADA', 'MANTENIMIENTO'])`, `z.number().int().gt(0)` |
| `OPERADOR` | `Operador` | `esquemaOperador` | `chk_rol_operador`, `chk_estado_operador` | `z.enum(['RECAUDADOR', 'SUPERVISOR'])`, `z.enum(['ACTIVO', 'INACTIVO'])` |
| `TURNO` | `Turno` | `esquemaTurno` | `chk_estado_turno`, no negatividad de importes | `z.enum(['ABIERTO', 'CERRADO'])`, `fondo_inicial_caja >= 0`, `total_recaudado_efectivo >= 0`, `total_declarado_cierre >= 0` |
| `CATEGORIA_VEHICULO` | `CategoriaVehiculo` | `esquemaCategoriaVehiculo` | `chk_ejes_min`, `chk_ejes_valido`, `chk_peso_positivo` | `numero_ejes_min >= 1`, `.refine(data => data.numero_ejes_max >= data.numero_ejes_min)`, `peso_maximo_ton > 0` |
| `TARIFA` | `Tarifa` | `esquemaTarifa` | `chk_monto_positivo`, `chk_fechas_vigencia` | `monto > 0`, `.refine(data => !data.fecha_fin_vigencia \|\| data.fecha_fin_vigencia >= data.fecha_inicio_vigencia)` |
| `VEHICULO` | `Vehiculo` | `esquemaVehiculo` | Límites VARCHAR | `placa.max(10)`, `marca.max(50)`, `modelo.max(50)`, `color.max(30)` |
| `CUENTA_TELEPEAJE` | `CuentaTelepeaje` | `esquemaCuentaTelepeaje` | `chk_estado_cuenta`, `chk_saldo_no_negativo` | `z.enum(['ACTIVA', 'SUSPENDIDA'])`, `saldo_disponible >= 0` |
| `TRANSACCION_PEAJE` | `TransaccionPeaje` | `esquemaTransaccionPeaje` | `chk_metodo_pago`, `chk_estado_paso`, `chk_monto_no_negativo` | `z.enum(['EFECTIVO', 'TELEPEAJE', 'EXENTO'])`, `z.enum(['APROBADO', 'EVASION', 'EXENTO'])`, `monto_tarifa >= 0` |
| `DETALLE_PAGO_TELEPEAJE` | `DetallePagoTelepeaje` | `esquemaDetallePagoTelepeaje` | No negatividad de saldos | `saldo_anterior >= 0`, `saldo_posterior >= 0`, `antena_lectora_id.max(30)` |
| `AUDITORIA_TRANSACCION` | `AuditoriaTransaccion` | `esquemaAuditoriaTransaccion` | `chk_tipo_operacion`, inmutabilidad | `z.enum(['INSERT', 'UPDATE', 'VOID'])`, tabla append-only protegida contra DELETE y UPDATE |

---

## 5. Puntos Abiertos para Integración con el Backend Real

1. **Estrategia de Concurrencia Optimista**:
   Actualmente el cierre de turno valida que `turno.estado === 'ABIERTO'` antes de cerrarlo emitiendo 409 Conflict si ya fue cerrado. Cuando se conecte a PostgreSQL se recomienda incluir una columna `version INTEGER DEFAULT 1` o comparar `updated_at` para prevenir colisiones entre múltiples instancias del navegador.

2. **Paginación en Listas Extensas**:
   Las colecciones de `transacciones`, `auditoria` y `operadores` actualmente devuelven arreglos completos porque la semilla inicial comprende cientos de registros. En entornos con miles de transacciones diarias, el backend deberá soportar parámetros estándar `limit` y `offset` o paginación basada en cursor `cursor_id`.

3. **Mecanismo de Autenticación en Producción**:
   El frontend gestiona la sesión en memoria y `localStorage` con los datos del usuario retornado por `POST /api/auth/login`. Para producción se requiere acordar si el backend emitirá una cookie `HttpOnly` con sesión segura o un encabezado de autorización `Bearer <token_jwt>`.

4. **Entidad del Administrador**:
   En el DDL relacional, la tabla `OPERADOR` define `chk_rol_operador CHECK (rol IN ('RECAUDADOR', 'SUPERVISOR'))`. El usuario `ADMIN-01` es una entidad puramente de interfaz según lo prescrito en los prototipos. Si se requiere persistir usuarios administradores en base de datos, se deberá coordinar la ampliación del CHECK a nivel de DDL (`'ADMIN'`) o la creación de una tabla específica de usuarios administrativos.
