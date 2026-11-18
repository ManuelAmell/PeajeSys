-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Integrantes:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_Consultas_PeajeSys.sql
-- DESCRIPCIÓN: Batería de 10 consultas de negocio de alta relevancia para la gestión
--              y fiscalización del sistema de peajes. Cumple estrictamente con la
--              cobertura técnica exigida por la Guía (Secciones 3.2 y 3.4):
--              - Al menos 3 consultas con JOIN entre varias tablas.
--              - Al menos 2 con funciones de agregación y GROUP BY / HAVING.
--              - Al menos 2 con subconsultas.
--              - Al menos 2 con funciones de texto, fecha, número y CASE / COALESCE.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CONSULTA 1
-- Cobertura Técnica: JOIN entre 4 tablas (TURNO, CASETA, ESTACION_PEAJE, OPERADOR)
-- Pregunta de Negocio: ¿Cuál es el recaudo consolidado en efectivo por estación,
--                      caseta y operador en los turnos cerrados formalmente?
-- Utilidad Gerencial: Permite a auditoría y finanzas validar la liquidación
--                     operativa de cajeros frente al efectivo entregado.
-- -----------------------------------------------------------------------------
SELECT 
    e.nombre AS estacion,
    c.numero_carril,
    c.tipo_carril,
    o.nombres || ' ' || o.apellidos AS operador,
    t.fecha,
    t.total_recaudado_efectivo
FROM TURNO t
JOIN CASETA c ON t.id_caseta = c.id_caseta
JOIN ESTACION_PEAJE e ON c.id_estacion = e.id_estacion
JOIN OPERADOR o ON t.id_operador = o.id_operador
WHERE t.estado = 'CERRADO'
ORDER BY t.fecha DESC, e.nombre;


-- -----------------------------------------------------------------------------
-- CONSULTA 2
-- Cobertura Técnica: JOIN entre 5 tablas (DETALLE_PAGO_TELEPEAJE, TRANSACCION_PEAJE,
--                    CUENTA_TELEPEAJE, VEHICULO, CATEGORIA_VEHICULO)
-- Pregunta de Negocio: ¿Qué vehículos con telepeaje han cruzado por las estaciones,
--                      cuál fue el número de ticket generado y su saldo resultante?
-- Utilidad Gerencial: Trazabilidad directa para la facturación mensual del cliente
--                     corporativo y conciliación de débitos automáticos RFID.
-- -----------------------------------------------------------------------------
SELECT 
    tp.numero_ticket,
    tp.fecha_hora,
    v.placa,
    cv.descripcion AS categoria,
    ct.tag_rfid_serial,
    dpt.saldo_anterior,
    dpt.saldo_posterior
FROM DETALLE_PAGO_TELEPEAJE dpt
JOIN TRANSACCION_PEAJE tp ON dpt.id_transaccion = tp.id_transaccion
JOIN CUENTA_TELEPEAJE ct ON dpt.id_cuenta = ct.id_cuenta
JOIN VEHICULO v ON ct.placa_vehiculo = v.placa
JOIN CATEGORIA_VEHICULO cv ON v.id_categoria = cv.id_categoria
ORDER BY tp.fecha_hora DESC;


-- -----------------------------------------------------------------------------
-- CONSULTA 3
-- Cobertura Técnica: JOIN entre 4 tablas (TRANSACCION_PEAJE, TURNO, CASETA, OPERADOR)
-- Pregunta de Negocio: ¿Qué transacciones han sido clasificadas como EXENTO o EVASION,
--                      en qué carril se produjeron y qué operador estaba de guardia?
-- Utilidad Gerencial: Detección preventiva de fraude, control de pérdidas y
--                     verificación de autorizaciones de exención institucional.
-- -----------------------------------------------------------------------------
SELECT 
    tp.id_transaccion,
    tp.numero_ticket,
    tp.fecha_hora,
    tp.estado_paso,
    c.numero_carril,
    o.nombres || ' ' || o.apellidos AS operador_responsable
FROM TRANSACCION_PEAJE tp
JOIN TURNO t ON tp.id_turno = t.id_turno
JOIN CASETA c ON t.id_caseta = c.id_caseta
JOIN OPERADOR o ON t.id_operador = o.id_operador
WHERE tp.estado_paso IN ('EXENTO', 'EVASION')
ORDER BY tp.fecha_hora DESC;


-- -----------------------------------------------------------------------------
-- CONSULTA 4
-- Cobertura Técnica: Funciones de Agregación (COUNT, SUM) con GROUP BY y HAVING
-- Pregunta de Negocio: ¿Qué categorías vehiculares han generado un recaudo acumulado
--                      total mayor a $30,000 COP y cuántos vehículos aportaron?
-- Utilidad Gerencial: Identificación de los segmentos de tráfico que aportan el
--                     mayor flujo de ingresos a la concesión vial.
-- -----------------------------------------------------------------------------
SELECT 
    cv.codigo,
    cv.descripcion,
    COUNT(tp.id_transaccion) AS total_pasos,
    SUM(tp.monto_tarifa) AS recaudo_total
FROM TRANSACCION_PEAJE tp
JOIN CATEGORIA_VEHICULO cv ON tp.id_categoria = cv.id_categoria
GROUP BY cv.codigo, cv.descripcion
HAVING SUM(tp.monto_tarifa) > 30000.00
ORDER BY recaudo_total DESC;


-- -----------------------------------------------------------------------------
-- CONSULTA 5
-- Cobertura Técnica: Agregación con funciones estadísticas (COUNT, AVG, ROUND) y HAVING
-- Pregunta de Negocio: ¿Qué casetas han atendido 2 o más transacciones y cuál ha sido
--                      su tarifa media cobrada por vehículo?
-- Utilidad Gerencial: Dimensionamiento del tráfico por carril para balanceo de carga
--                     entre carriles manuales y automáticos.
-- -----------------------------------------------------------------------------
SELECT 
    c.id_caseta,
    c.numero_carril,
    c.tipo_carril,
    COUNT(tp.id_transaccion) AS cantidad_transacciones,
    ROUND(AVG(tp.monto_tarifa), 2) AS tarifa_promedio
FROM CASETA c
JOIN TURNO t ON c.id_caseta = t.id_caseta
JOIN TRANSACCION_PEAJE tp ON t.id_turno = tp.id_turno
GROUP BY c.id_caseta, c.numero_carril, c.tipo_carril
HAVING COUNT(tp.id_transaccion) >= 2
ORDER BY cantidad_transacciones DESC;


-- -----------------------------------------------------------------------------
-- CONSULTA 6
-- Cobertura Técnica: Subconsulta no correlacionada en cláusula WHERE
-- Pregunta de Negocio: ¿Qué cuentas de telepeaje poseen un saldo disponible por debajo
--                      del promedio general del sistema?
-- Utilidad Gerencial: Campañas de fidelización, notificación push para recarga
--                     preventiva antes de que el saldo entre en estado crítico.
-- -----------------------------------------------------------------------------
SELECT 
    id_cuenta,
    placa_vehiculo,
    tag_rfid_serial,
    saldo_disponible,
    estado_cuenta
FROM CUENTA_TELEPEAJE
WHERE saldo_disponible < (
    SELECT AVG(saldo_disponible) 
    FROM CUENTA_TELEPEAJE
)
ORDER BY saldo_disponible ASC;


-- -----------------------------------------------------------------------------
-- CONSULTA 7
-- Cobertura Técnica: Subconsulta correlacionada con operador IN
-- Pregunta de Negocio: ¿Qué operadores han registrado descuadres de caja con faltantes
--                      de dinero (diferencia negativa) en el cierre de turno?
-- Utilidad Gerencial: Monitoreo de riesgos y auditoría de talento humano para
--                     programación de capacitaciones en manejo de efectivo.
-- -----------------------------------------------------------------------------
SELECT 
    id_operador,
    numero_documento,
    nombres,
    apellidos,
    codigo_empleado
FROM OPERADOR
WHERE id_operador IN (
    SELECT id_operador 
    FROM TURNO 
    WHERE diferencia_descuadre < 0
);


-- -----------------------------------------------------------------------------
-- CONSULTA 8
-- Cobertura Técnica: Funciones de Texto (UPPER), Fecha (TO_CHAR, INTERVAL) y CASE
-- Pregunta de Negocio: Listar las transacciones formateando el número de ticket en
--                      mayúsculas, mostrando el día de la semana y clasificando su
--                      antigüedad operativa ('Hoy', 'Esta semana', 'Anterior').
-- Utilidad Gerencial: Reporte amigable para inspección visual de paso en pantalla
--                     de supervisor en tiempo real.
-- -----------------------------------------------------------------------------
SELECT 
    UPPER(numero_ticket) AS ticket_formateado,
    TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI:SS') AS fecha_formateada,
    TRIM(TO_CHAR(fecha_hora, 'Day')) AS dia_semana,
    placa_detectada,
    metodo_pago,
    CASE 
        WHEN fecha_hora >= CURRENT_DATE THEN 'Hoy'
        WHEN fecha_hora >= CURRENT_DATE - INTERVAL '7 days' THEN 'Esta semana'
        ELSE 'Anterior'
    END AS clasificacion_antiguedad
FROM TRANSACCION_PEAJE
ORDER BY fecha_hora DESC;


-- -----------------------------------------------------------------------------
-- CONSULTA 9
-- Cobertura Técnica: Funciones numéricas, COALESCE y Expresión condicional CASE
-- Pregunta de Negocio: Emitir un arqueo consolidado de turnos evaluando si el cajero
--                      cerró con saldo 'SOBRANTE (+)', 'FALTANTE (-)' o 'CUADRADO'.
-- Utilidad Gerencial: Control contable diario sin valores nulos para entrega formal
--                     a tesorería y transportadora de valores.
-- -----------------------------------------------------------------------------
SELECT 
    id_turno,
    fecha,
    total_recaudado_efectivo,
    COALESCE(total_declarado_cierre, 0.00) AS declarado,
    COALESCE(diferencia_descuadre, 0.00) AS descuadre,
    CASE 
        WHEN diferencia_descuadre > 0 THEN 'SOBRANTE (+)'
        WHEN diferencia_descuadre < 0 THEN 'FALTANTE (-)'
        WHEN diferencia_descuadre = 0 THEN 'CUADRADO'
        ELSE 'EN PROCESO'
    END AS diagnostico_caja
FROM TURNO
ORDER BY fecha DESC, id_turno;


-- -----------------------------------------------------------------------------
-- CONSULTA 10
-- Cobertura Técnica: JOIN + Agregación + Expresión matemática (ROUND, porcentaje)
--                    y Subconsulta escalar integrada
-- Pregunta de Negocio: ¿Cuál es la participación porcentual y monto total de cada
--                      método de pago (EFECTIVO vs TELEPEAJE) sobre el gran total?
-- Utilidad Gerencial: Métrica clave (KPI) para medir el nivel de adopción de la
--                      tecnología de telepeaje frente al uso de efectivo en vía.
-- -----------------------------------------------------------------------------
SELECT 
    metodo_pago,
    COUNT(*) AS cantidad_pasos,
    SUM(monto_tarifa) AS total_recaudado,
    ROUND(
        (SUM(monto_tarifa) * 100.0) / (SELECT SUM(monto_tarifa) FROM TRANSACCION_PEAJE), 
        2
    ) AS porcentaje_participacion
FROM TRANSACCION_PEAJE
GROUP BY metodo_pago
ORDER BY total_recaudado DESC;
