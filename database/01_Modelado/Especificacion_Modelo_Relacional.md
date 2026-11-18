# Especificación del Modelo Relacional y Normalización: PeajeSys
**Asignatura:** Bases de Datos (2026-2) — Universidad de Cartagena  
**Docente:** Víctor Valdelamar  
**Proyecto:** PeajeSys (Sistema Integral de Control, Facturación y Recaudación de Peajes Viales)  
**Equipo:** Camilo Guzmán, Samuel Otero, Alex Flórez, Manuel Amell  

---

## 1. Diagrama Entidad-Relación (DER) en Mermaid

```mermaid
erDiagram
    ESTACION_PEAJE ||--o{ CASETA : "contiene (1:N)"
    ESTACION_PEAJE ||--o{ TARIFA : "parametriza (1:N)"
    CASETA ||--o{ TURNO : "alberga (1:N)"
    OPERADOR ||--o{ TURNO : "atiende (1:N)"
    CATEGORIA_VEHICULO ||--o{ TARIFA : "grava (1:N)"
    CATEGORIA_VEHICULO ||--o{ VEHICULO : "clasifica (1:N)"
    CATEGORIA_VEHICULO ||--o{ TRANSACCION_PEAJE : "clasifica paso (1:N)"
    TARIFA ||--o{ TRANSACCION_PEAJE : "aplica valor (1:N)"
    TURNO ||--o{ TRANSACCION_PEAJE : "registra cobros (1:N)"
    VEHICULO ||--o| CUENTA_TELEPEAJE : "vincula TAG (1:1)"
    CUENTA_TELEPEAJE ||--o{ DETALLE_PAGO_TELEPEAJE : "debita fondos (1:N)"
    TRANSACCION_PEAJE ||--o| DETALLE_PAGO_TELEPEAJE : "desglosa conciliacion (1:1)"
    TRANSACCION_PEAJE ||--o{ AUDITORIA_TRANSACCION : "genera traza (1:N)"

    ESTACION_PEAJE {
        int id_estacion PK
        varchar nombre
        varchar codigo_estacion UK
        varchar ubicacion_geografica
        varchar sentido_via
        varchar estado
        timestamptz created_at
    }

    CASETA {
        int id_caseta PK
        int id_estacion FK
        int numero_carril
        varchar tipo_carril
        varchar estado
    }

    OPERADOR {
        int id_operador PK
        varchar numero_documento UK
        varchar nombres
        varchar apellidos
        varchar codigo_empleado UK
        varchar rol
        varchar estado
    }

    TURNO {
        bigint id_turno PK
        int id_caseta FK
        int id_operador FK
        date fecha
        boolean diurno
        numeric fondo_inicial_caja
        numeric total_recaudado_efectivo
        numeric total_declarado_cierre
        numeric diferencia_descuadre
        varchar estado
    }

    CATEGORIA_VEHICULO {
        int id_categoria PK
        varchar codigo UK
        varchar descripcion
        int numero_ejes_min
        int numero_ejes_max
        numeric peso_maximo_ton
        boolean activo
    }

    TARIFA {
        int id_tarifa PK
        int id_estacion FK
        int id_categoria FK
        numeric monto
        varchar resolucion_legal
        date fecha_inicio_vigencia
        date fecha_fin_vigencia
        boolean activa
    }

    VEHICULO {
        varchar placa PK
        int id_categoria FK
        varchar marca
        varchar modelo
        varchar color
    }

    CUENTA_TELEPEAJE {
        bigint id_cuenta PK
        varchar placa_vehiculo UK,FK
        varchar tag_rfid_serial UK
        numeric saldo_disponible
        varchar estado_cuenta
    }

    TRANSACCION_PEAJE {
        bigint id_transaccion PK
        bigint id_turno FK
        int id_tarifa FK
        int id_categoria FK
        varchar placa_detectada
        numeric monto_tarifa
        varchar metodo_pago
        varchar numero_ticket UK
        timestamptz fecha_hora
        varchar estado_paso
    }

    DETALLE_PAGO_TELEPEAJE {
        bigint id_detalle_telepeaje PK
        bigint id_transaccion UK,FK
        bigint id_cuenta FK
        numeric saldo_anterior
        numeric saldo_posterior
        varchar antena_lectora_id
    }

    AUDITORIA_TRANSACCION {
        bigint id_auditoria PK
        bigint id_transaccion FK
        varchar tipo_operacion
        varchar usuario_sistema
        timestamptz fecha_hora_evento
        varchar motivo
    }
```

---

## 2. Demostración de Normalización en Tercera Forma Normal (3FN)

El diseño relacional de **PeajeSys** garantiza la ausencia de redundancias, anomalías de inserción, actualización y borrado mediante el cumplimiento riguroso de las formas normales:

### 2.1 Primera Forma Normal (1FN)
* Todos los atributos contienen **valores atómicos e indivisibles**. No existen atributos multivaluados ni vectores compuestos.
* Cada tabla cuenta con una **clave primaria unívoca** (`PK`), asegurando la unicidad de las tuplas.

### 2.2 Segunda Forma Normal (2FN)
* Cumple 1FN.
* Todos los atributos no clave tienen **dependencia funcional completa** de la clave primaria.
* Se resolvió la relación Muchos a Muchos ($N:M$) entre `ESTACION_PEAJE` y `CATEGORIA_VEHICULO` mediante la entidad asociativa `TARIFA`, evitando dependencias parciales sobre claves compuestas.

### 2.3 Tercera Forma Normal (3FN)
* Cumple 2FN.
* No existen **dependencias transitivas** entre atributos no clave ($X \to Y \to Z$).
  - Por ejemplo: En `TRANSACCION_PEAJE`, los datos del cajero o caseta no se repiten en la transacción; se referencia `id_turno`, el cual a su vez enlaza a `CASETA` y `OPERADOR`.
  - En `VEHICULO`, la descripción y límites de ejes no se almacenan en la tupla del vehículo sino en `CATEGORIA_VEHICULO`.
  - En `CUENTA_TELEPEAJE`, los datos técnicos del fabricante automotor no se duplican, referenciando exclusivamente la `placa` enlazada a `VEHICULO`.

---

## 3. Matriz de Cardinalidades y Reglas de Integridad

| Relación | Entidad Origen | Cardinalidad | Entidad Destino | Regla de Integridad Referencial |
| :--- | :--- | :---: | :--- | :--- |
| Infraestructura Carril | `ESTACION_PEAJE` | $1:N$ | `CASETA` | `ON DELETE RESTRICT` (No eliminar estación con casetas) |
| Asignación Operativa | `CASETA` | $1:N$ | `TURNO` | `ON DELETE RESTRICT` (No eliminar casetas con turnos) |
| Responsable de Turno | `OPERADOR` | $1:N$ | `TURNO` | `ON DELETE RESTRICT` (No borrar operadores con histórico) |
| Parametrización Tarifaria | `ESTACION_PEAJE` | $1:N$ | `TARIFA` | `ON DELETE RESTRICT` |
| Clasificación Tarifaria | `CATEGORIA_VEHICULO` | $1:N$ | `TARIFA` | `ON DELETE RESTRICT` |
| Padrón Vehicular | `CATEGORIA_VEHICULO` | $1:N$ | `VEHICULO` | `ON DELETE RESTRICT` |
| Dispositivo RFID | `VEHICULO` | $1:1$ | `CUENTA_TELEPEAJE` | `ON DELETE RESTRICT`, `placa_vehiculo UNIQUE` |
| Cruce en Caseta | `TURNO` | $1:N$ | `TRANSACCION_PEAJE` | `ON DELETE RESTRICT` |
| Base Tarifaria de Paso | `TARIFA` | $1:N$ | `TRANSACCION_PEAJE` | `ON DELETE RESTRICT` |
| Conciliación Débito | `TRANSACCION_PEAJE`| $1:1$ | `DETALLE_PAGO_TELEPEAJE`| `ON DELETE RESTRICT`, `id_transaccion UNIQUE` |
| Saldo Prepago | `CUENTA_TELEPEAJE` | $1:N$ | `DETALLE_PAGO_TELEPEAJE`| `ON DELETE RESTRICT` |
| Pista Forense | `TRANSACCION_PEAJE`| $1:N$ | `AUDITORIA_TRANSACCION` | `ON DELETE RESTRICT`, `Append-Only Trigger` |
