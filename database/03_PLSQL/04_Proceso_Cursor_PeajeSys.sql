-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE CONTROL Y RECAUDO DE PEAJES (PostgreSQL)
-- Universidad de Cartagena - Facultad de Ingeniería - Programa de Ingeniería de Sistemas
-- Asignatura: Bases de Datos (2026-2) - Docente: Víctor Valdelamar
-- Equipo de Trabajo:
--   Camilo Guzmán (0222510041)
--   Samuel Otero (0222510028)
--   Alex Florez (0222510031)
--   Manuel Amell (0222421001)
--
-- ARCHIVO: 03_PLSQL/04_Proceso_Cursor_PeajeSys.sql
-- DESCRIPCIÓN: Proceso Batch con CURSOR Explícito y Manejo Robusto de Excepciones.
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Implementar al menos un proceso que recorra varias filas con CURSOR,
--                aplique lógica de negocio avanzada y gestione errores previsibles.
--              - Demostración mediante Procedimiento Almacenado y Bloque Anónimo (DO).
-- =============================================================================

-- =============================================================================
-- 1. PROCEDIMIENTO ALMACENADO CON CURSOR EXPLÍCITO Y GESTIÓN DE EXCEPCIONES
-- =============================================================================
-- Propósito de Negocio:
--   Proceso de auditoría y conciliación nocturna de la concesión vial.
--   Recorre todas las cuentas de telepeaje RFID activas en el sistema para:
--     1. Detectar cuentas con saldo $0 que sigan activas y suspenderlas preventivamente
--        para evitar evasiones involuntarias en las barreras automáticas.
--     2. Clasificar cuentas en 'SALDO CRÍTICO' (< $20.000 COP) y proyectar los cruces
--        restantes según la tarifa de su categoría vehicular.
--     3. Gestionar errores fila a fila (aislamiento de fallos) de modo que una excepción
--        en un registro no cancele el lote completo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_proceso_nocturno_monitoreo_cuentas(
    OUT p_total_procesadas INT,
    OUT p_cuentas_optimas INT,
    OUT p_cuentas_criticas INT,
    OUT p_cuentas_suspendidas INT,
    OUT p_errores_capturados INT
)
LANGUAGE plpgsql AS $$
DECLARE
    -- Declaración del Cursor Explícito
    cur_cuentas CURSOR FOR
        SELECT 
            c.id_cuenta,
            c.placa_vehiculo,
            c.tag_rfid_serial,
            c.saldo_disponible,
            c.estado_cuenta,
            v.id_categoria,
            cv.codigo AS categoria_codigo
        FROM CUENTA_TELEPEAJE c
        JOIN VEHICULO v ON c.placa_vehiculo = v.placa
        JOIN CATEGORIA_VEHICULO cv ON v.id_categoria = cv.id_categoria
        ORDER BY c.saldo_disponible ASC, c.id_cuenta ASC;

    -- Registro para capturar la fila del cursor
    rec RECORD;

    -- Variables de trabajo interno
    v_tarifa_referencia NUMERIC(10,2);
    v_cruces_estimados INT;
BEGIN
    -- Inicializar acumuladores y contadores
    p_total_procesadas     := 0;
    p_cuentas_optimas      := 0;
    p_cuentas_criticas     := 0;
    p_cuentas_suspendidas  := 0;
    p_errores_capturados   := 0;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'INICIANDO PROCESO BATCH NOCTURNO: AUDITORÍA Y MONITOREO DE CUENTAS RFID';
    RAISE NOTICE 'Hora de Inicio: %', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS');
    RAISE NOTICE '=============================================================================';

    -- Apertura y recorrido del Cursor Explícito
    OPEN cur_cuentas;
    LOOP
        FETCH cur_cuentas INTO rec;
        EXIT WHEN NOT FOUND;

        p_total_procesadas := p_total_procesadas + 1;

        -- Bloque interno con manejo de excepciones para aislar fallos por registro
        BEGIN
            -- -----------------------------------------------------------------
            -- REGLA 1: Saldo en Cero y Cuenta Activa -> Suspensión Automática
            -- -----------------------------------------------------------------
            IF rec.saldo_disponible = 0.00 AND rec.estado_cuenta = 'ACTIVA' THEN
                UPDATE CUENTA_TELEPEAJE
                SET estado_cuenta = 'SUSPENDIDA'
                WHERE id_cuenta = rec.id_cuenta;

                p_cuentas_suspendidas := p_cuentas_suspendidas + 1;
                RAISE NOTICE '[SUSPENSIÓN AUTOMÁTICA] Cuenta ID % | Placa: % | TAG: % | Saldo: $0.00 COP -> Estado cambiado a SUSPENDIDA.',
                    rec.id_cuenta, rec.placa_vehiculo, rec.tag_rfid_serial;

            -- -----------------------------------------------------------------
            -- REGLA 2: Saldo Crítico (< $20.000 COP) y Cuenta Activa -> Alerta Temprana
            -- -----------------------------------------------------------------
            ELSIF rec.saldo_disponible > 0.00 AND rec.saldo_disponible < 20000.00 AND rec.estado_cuenta = 'ACTIVA' THEN
                -- Obtener tarifa de referencia para la Estación Gambote (ID: 1)
                SELECT COALESCE(monto, 10500.00) INTO v_tarifa_referencia
                FROM TARIFA
                WHERE id_estacion = 1
                  AND id_categoria = rec.id_categoria
                  AND activa = TRUE
                ORDER BY fecha_inicio_vigencia DESC
                LIMIT 1;

                -- Previsión de excepción: División por cero si la tarifa fuera 0
                IF v_tarifa_referencia = 0.00 THEN
                    RAISE EXCEPTION 'Tarifa calculada en $0 para vehículo comercial placa %.', rec.placa_vehiculo
                        USING ERRCODE = 'P0050';
                END IF;

                v_cruces_estimados := FLOOR(rec.saldo_disponible / v_tarifa_referencia)::INT;
                p_cuentas_criticas := p_cuentas_criticas + 1;

                RAISE NOTICE '[SALDO CRÍTICO] Cuenta ID % | Placa: % | Cat: % | Saldo: $ % COP | Cruces restantes: %',
                    rec.id_cuenta, rec.placa_vehiculo, rec.categoria_codigo, rec.saldo_disponible, v_cruces_estimados;

            -- -----------------------------------------------------------------
            -- REGLA 3: Saldo Saludable y Conforme
            -- -----------------------------------------------------------------
            ELSIF rec.saldo_disponible >= 20000.00 THEN
                p_cuentas_optimas := p_cuentas_optimas + 1;
            END IF;

        EXCEPTION
            -- Captura estructurada de errores previsibles o anomalías de datos
            WHEN division_by_zero THEN
                p_errores_capturados := p_errores_capturados + 1;
                RAISE WARNING '[EXCEPCIÓN CAPTURADA: División por cero] En cuenta ID % (Placa %): Tarifa base nula o inválida.',
                    rec.id_cuenta, rec.placa_vehiculo;
            WHEN OTHERS THEN
                p_errores_capturados := p_errores_capturados + 1;
                RAISE WARNING '[EXCEPCIÓN CAPTURADA: Error no esperado] En cuenta ID % (Placa %): % (SQLSTATE: %)',
                    rec.id_cuenta, rec.placa_vehiculo, SQLERRM, SQLSTATE;
        END;

    END LOOP;
    CLOSE cur_cuentas;

    RAISE NOTICE '-----------------------------------------------------------------------------';
    RAISE NOTICE 'RESUMEN DE EJECUCIÓN DEL LOTE BATCH:';
    RAISE NOTICE '  Total cuentas evaluadas      : %', p_total_procesadas;
    RAISE NOTICE '  Cuentas con saldo óptimo     : %', p_cuentas_optimas;
    RAISE NOTICE '  Cuentas en saldo crítico     : %', p_cuentas_criticas;
    RAISE NOTICE '  Cuentas suspendidas por $0   : %', p_cuentas_suspendidas;
    RAISE NOTICE '  Errores aislados y capturados: %', p_errores_capturados;
    RAISE NOTICE '=============================================================================';
END;
$$;


-- =============================================================================
-- 2. BLOQUE ANÓNIMO PL/pgSQL (DO) CON CURSOR Y EXCEPCIONES PARA DEMOSTRACIÓN EN VIVO
-- =============================================================================
-- Permite al estudiante ejecutar y mostrar en caliente frente al docente
-- el funcionamiento del cursor, la lógica iterativa y la captura de errores.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_total INT;
    v_optimas INT;
    v_criticas INT;
    v_suspendidas INT;
    v_errores INT;
BEGIN
    RAISE NOTICE 'EJECUTANDO DEMOSTRACIÓN EN VIVO DEL PROCESO CON CURSOR...';
    CALL pr_proceso_nocturno_monitoreo_cuentas(v_total, v_optimas, v_criticas, v_suspendidas, v_errores);
END;
$$;
