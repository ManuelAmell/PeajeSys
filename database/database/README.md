 
 
 
  PeajeSys — Sistema Integral de Control, Facturación y Recaudación de Peajes Viales
**Proyecto de Asignatura: Bases de Datos (2026-2)**  
**Universidad de Cartagena — Facultad de Ingeniería — Programa de Ingeniería de Sistemas**  
**Docente:** Víctor Valdelamar  

### Integrantes del Equipo:
- **Camilo Guzmán** (Código: 0222510041)
- **Samuel Otero** (Código: 0222510028)
- **Alex Florez** (Código: 0222510031)
- **Manuel Amell** (Código: 0222421001)

---

## 1. Estructura de la Entrega Final (Corte 3)

El repositorio se encuentra rigurosamente normalizado conforme al **Numeral 4.4 de la Guía Oficial**:

```
Avance-2-PeajeSys/ (o BD_Grupo##_PeajeSys/)
├── 00_Master_PeajeSys.sql                     # Script maestro consolidado de ejecución total
├── README.md                                  # Este documento de instrucciones y arquitectura
├── PeajeSys_Avance_Corte1.pdf                 # Informe de Avance Corte 1 (Análisis y Diseño)
├── PeajeSys_Avance_Corte2.pdf                 # Informe de Avance Corte 2 (Implementación SQL)
├── Guia Ejecucion BD PeajeSys.pdf             # Guía visual de ejecución en PostgreSQL
├── 01_Modelado/                               # Fase 1: Análisis, Modelado y Diccionario
│   ├── Diccionario_Datos_PeajeSys.md          # Diccionario completo de las 11 tablas en 3FN
│   └── Especificacion_Modelo_Relacional.md    # DER en Mermaid, cardinalidades y normalización
├── 02_SQL/                                    # Fase 2: Esquema Físico y Consultas
│   ├── 01_DDL_PeajeSys.sql                    # Creación física de tablas y restricciones
│   ├── 02_DML_Datos_PeajeSys.sql              # Carga masiva (+10 reg/tabla) y pruebas ACID
│   ├── 03_Consultas_PeajeSys.sql              # 10 Consultas de negocio avanzadas
│   └── 04_Objetos_PeajeSys.sql                # Vistas, Secuencia e Índice compuesto
└── 03_PLSQL/                                  # Fase 3: Capa Procedimental y Pruebas
    ├── 01_Funciones_PeajeSys.sql              # Funciones: fn_obtener_tarifa, fn_validar_aptitud...
    ├── 02_Procedimientos_PeajeSys.sql         # Procedimientos: pr_registrar_paso, pr_cerrar_arqueo...
    ├── 03_Triggers_PeajeSys.sql               # Triggers: saldo negativo, auditoría automática...
    ├── 04_Proceso_Cursor_PeajeSys.sql         # Proceso Batch con Cursor y Excepciones
    ├── 05_Matriz_Pruebas_PeajeSys.sql         # 11 Casos de prueba automatizados y errores
```

---

## 2. Instrucciones y Orden Exacto de Ejecución

### Opción A: Reconstrucción Completa con Script Maestro (Recomendada)
Para levantar todo el sistema desde cero (tablas, datos, vistas, funciones, triggers, procedimientos, cursor, consultas y matriz de pruebas) en una sola operación:

```bash
# En consola psql (PostgreSQL 14+)
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS peajesys;"
psql -U postgres -d postgres -c "CREATE DATABASE peajesys;"
psql -U postgres -d peajesys -f 00_Master_PeajeSys.sql
```
*O bien, en **pgAdmin 4**, abrir `00_Master_PeajeSys.sql` y presionar **F5**.*

---

### Opción B: Ejecución Modular por Archivos
Si se desea ejecutar componente por componente en orden de dependencias referenciales:

1. **`02_SQL/01_DDL_PeajeSys.sql`**  
   Crea las 11 tablas relacionales, claves primarias, foráneas, restricciones CHECK, UNIQUE y disparador base de auditoría inmutable.
2. **`02_SQL/02_DML_Datos_PeajeSys.sql`**  
   Carga los datos iniciales de prueba (más de 10 registros útiles por tabla principal) y ejecuta casos transaccionales DML con `COMMIT` y `ROLLBACK`.
3. **`02_SQL/04_Objetos_PeajeSys.sql`**  
   Instala las vistas de negocio (`vw_resumen_diario_estacion`, `vw_estado_cuentas_telepeaje`), la secuencia (`seq_numero_ticket`) y el índice B-Tree compuesto (`idx_transaccion_fecha_turno`).
4. **`03_PLSQL/01_Funciones_PeajeSys.sql`**  
   Compila las funciones almacenadas de liquidación tarifaria, validación RFID y cálculo de descuadres.
5. **`03_PLSQL/03_Triggers_PeajeSys.sql`**  
   Activa los disparadores de prevención de saldo negativo, auditoría de evasiones y acumulación en tiempo real.
6. **`03_PLSQL/02_Procedimientos_PeajeSys.sql`**  
   Compila los procedimientos almacenados de cobro atómico por telepeaje, arqueo de turno y recarga de saldo.
7. **`03_PLSQL/04_Proceso_Cursor_PeajeSys.sql`**  
   Compila y ejecuta el proceso batch con cursor explícito y manejo de excepciones sobre cuentas RFID.
8. **`02_SQL/03_Consultas_PeajeSys.sql`**  
   Ejecuta la batería de 10 consultas analíticas de negocio (JOINs, GROUP BY/HAVING, Subconsultas, Expresiones CASE).
9. **`03_PLSQL/05_Matriz_Pruebas_PeajeSys.sql`**  
   Ejecuta la suite de pruebas unitarias y de integración, verificando resultados normales, límites y captura controlada de errores intencionales.

---

## 3. Resumen de la Capa Procedimental (PL/pgSQL)

| Tipo de Objeto | Nombre del Objeto | Rol en el Negocio |
| :--- | :--- | :--- |
| **Función** | `fn_obtener_tarifa_vigente` | Liquida la tarifa vigente según categoría del vehículo y peaje. |
| **Función** | `fn_validar_aptitud_telepeaje` | Valida en tiempo real si el TAG RFID tiene saldo y está activo. |
| **Función** | `fn_calcular_descuadre_turno` | Compara efectivo físico vs recaudo del sistema en turno. |
| **Función** | `fn_estimar_cruces_restantes` | Estima cuántos pasos le quedan a un vehículo según saldo. |
| **Procedimiento** | `pr_registrar_paso_telepeaje` | Cobro atómico RFID: debita saldo, crea ticket y registra paso. |
| **Procedimiento** | `pr_cerrar_arqueo_turno` | Cierre financiero formal de turno con detección de descuadres. |
| **Procedimiento** | `pr_recargar_saldo_telepeaje` | Inyección de saldo a cuentas RFID y reactivación automática. |
| **Trigger** | `trg_prevenir_saldo_negativo` | Impide a nivel de motor saldos negativos en cuentas prepago. |
| **Trigger** | `trg_auditar_transacciones_sensibles` | Registra automáticamente en auditoría evasiones y exentos. |
| **Trigger** | `trg_acumular_recaudo_efectivo` | Sincroniza acumulado del turno tras cada cobro manual. |
| **Trigger** | `trg_auditoria_inmutable` | Garantiza que la bitácora legal sea estrictamente append-only. |
| **Cursor / Batch**| `pr_proceso_nocturno_monitoreo_cuentas` | Recorre con cursor todas las cuentas, suspende cuentas en 0 y diagnostica saldos críticos con manejo de excepciones. |
