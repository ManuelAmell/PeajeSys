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
-- ARCHIVO: 03_PLSQL/05_Matriz_Pruebas_PeajeSys.sql
-- DESCRIPCIÓN: Batería y Matriz de Pruebas Automatizadas de la Capa Procedimental.
--              Cumple con los Numerales 4.2 y 4.3 de la Guía Oficial:
--              - Al menos 10 casos de prueba documentados (normales, límites y errores).
--              - Demostración de provocación intencional de errores y manejo controlado.
--              - Verificación de Funciones, Procedimientos, Triggers y Procesos con Cursor.
--              - Pruebas 100% aisladas, idempotentes y re-ejecutables.
-- =============================================================================

DO $$
BEGIN
   RAISE NOTICE '=============================================================================';
   RAISE NOTICE 'INICIANDO BATERÍA Y MATRIZ DE PRUEBAS DE PROCEDIMIENTOS, TRIGGERS Y FUNCIONES';
   RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- PRUEBA 01 [NORMAL / CAMINO FELIZ]: Registro Transaccional de Cobro por Telepeaje
-- Objetivo: Validar que pr_registrar_paso_telepeaje realiza el ciclo completo:
--           generación de ticket, inserción de transacción, detalle RFID y débito.
-- =============================================================================
DO $$
DECLARE
    v_id_transaccion BIGINT;
    v_ticket VARCHAR;
    v_cobrado NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_saldo_inicial NUMERIC(12,2);
BEGIN
    -- Asegurar precondiciones operativas (idempotencia)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET saldo_disponible = 150000.00, estado_cuenta = 'ACTIVA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112233';

    SELECT saldo_disponible INTO v_saldo_inicial FROM CUENTA_TELEPEAJE WHERE tag_rfid_serial = 'TAG-COL-9900112233';

    CALL pr_registrar_paso_telepeaje(
        p_id_turno         := 10,
        p_tag_serial       := 'TAG-COL-9900112233',
        p_antena_id        := 'ANT-CAM-03A',
        p_id_transaccion   := v_id_transaccion,
        p_numero_ticket    := v_ticket,
        p_monto_cobrado    := v_cobrado,
        p_saldo_restante   := v_saldo
    );

    IF v_id_transaccion IS NOT NULL AND v_saldo = (v_saldo_inicial - v_cobrado) THEN
        RAISE NOTICE '[PRUEBA 01: EXITOSA] Cobro RFID efectuado. Ticket: %, Cobrado: $ %, Nuevo Saldo: $ % COP.',
            v_ticket, v_cobrado, v_saldo;
    ELSE
        RAISE EXCEPTION '[PRUEBA 01: FALLIDA] No se actualizó correctamente el saldo o transacción.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 02 [ERROR CONTROLADO]: Provocación Intencional de Saldo Insuficiente
-- Objetivo: Demostrar que ante un vehículo con saldo menor a la tarifa, el
--           procedimiento aborta limpiamente sin permitir paso ni alterar saldos.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_error_atrapado BOOLEAN := FALSE;
BEGIN
    -- Asegurar precondición: turno abierto, cuenta activa pero con saldo menor a tarifa ($8.000 vs $15.300)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET saldo_disponible = 8000.00, estado_cuenta = 'ACTIVA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112236';

    BEGIN
        CALL pr_registrar_paso_telepeaje(
            p_id_turno       := 10,
            p_tag_serial     := 'TAG-COL-9900112236',
            p_antena_id      := 'ANT-CAM-03A',
            p_id_transaccion := v_id_tx,
            p_numero_ticket  := v_tck,
            p_monto_cobrado  := v_monto,
            p_saldo_restante := v_saldo
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_error_atrapado := TRUE;
            RAISE NOTICE '[PRUEBA 02: EXITOSA - ERROR ATRAPADO] Excepción controlada: "%" (SQLSTATE: %)',
                SQLERRM, SQLSTATE;
    END;

    IF NOT v_error_atrapado THEN
        RAISE EXCEPTION '[PRUEBA 02: FALLIDA] Se permitió el paso a un vehículo con saldo insuficiente.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 03 [ERROR CONTROLADO]: Intento de Cruce con TAG Suspendido o Inactivo
-- Objetivo: Verificar que cuentas suspendidas no puedan realizar cruces.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
    v_error_atrapado BOOLEAN := FALSE;
BEGIN
    -- Asegurar precondición: el turno debe estar ABIERTO y la cuenta estrictamente SUSPENDIDA
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE 
    SET estado_cuenta = 'SUSPENDIDA' 
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';

    BEGIN
        CALL pr_registrar_paso_telepeaje(
            p_id_turno       := 10,
            p_tag_serial     := 'TAG-COL-9900112238',
            p_antena_id      := 'ANT-CAM-03A',
            p_id_transaccion := v_id_tx,
            p_numero_ticket  := v_tck,
            p_monto_cobrado  := v_monto,
            p_saldo_restante := v_saldo
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_error_atrapado := TRUE;
            RAISE NOTICE '[PRUEBA 03: EXITOSA - ERROR ATRAPADO] Bloqueo efectivo de cuenta suspendida: "%"', SQLERRM;
    END;

    IF NOT v_error_atrapado THEN
        RAISE EXCEPTION '[PRUEBA 03: FALLIDA] Se permitió transaccionar con una cuenta suspendida.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 04 [CASO LÍMITE]: Cobro con Saldo Exactamente Igual a la Tarifa
-- Objetivo: Validar que si el saldo es exactamente igual a la tarifa, se apruebe
--           el paso y el saldo quede exactamente en $0.00 COP.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_tck VARCHAR;
    v_monto NUMERIC(10,2);
    v_saldo NUMERIC(12,2);
BEGIN
    -- Asegurar precondición: cuenta activa con saldo exacto de $10.500 COP (Placa UYT890 - Cat I)
    UPDATE TURNO SET estado = 'ABIERTO' WHERE id_turno = 10;
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 10500.00, estado_cuenta = 'ACTIVA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112234';

    CALL pr_registrar_paso_telepeaje(
        p_id_turno       := 10,
        p_tag_serial     := 'TAG-COL-9900112234',
        p_antena_id      := 'ANT-CAM-03A',
        p_id_transaccion := v_id_tx,
        p_numero_ticket  := v_tck,
        p_monto_cobrado  := v_monto,
        p_saldo_restante := v_saldo
    );

    IF v_saldo = 0.00 THEN
        RAISE NOTICE '[PRUEBA 04: EXITOSA - CASO LÍMITE] Cobro exacto realizado. Saldo posterior exacto: $0.00 COP.';
    ELSE
        RAISE EXCEPTION '[PRUEBA 04: FALLIDA] El saldo posterior debió ser 0.00 y fue %', v_saldo;
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 05 [TRIGGER DE INTEGRIDAD]: Disparo de trg_prevenir_saldo_negativo
-- Objetivo: Demostrar que un UPDATE directo que intente violar la regla de saldo
--           no negativo es rechazado de inmediato por el disparador.
-- =============================================================================
DO $$
DECLARE
    v_trigger_activo BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE CUENTA_TELEPEAJE
        SET saldo_disponible = -25000.00
        WHERE id_cuenta = 1;
    EXCEPTION
        WHEN OTHERS THEN
            v_trigger_activo := TRUE;
            RAISE NOTICE '[PRUEBA 05: EXITOSA - TRIGGER INTEGRIDAD] trg_prevenir_saldo_negativo bloqueó la operación: "%"', SQLERRM;
    END;

    IF NOT v_trigger_activo THEN
        RAISE EXCEPTION '[PRUEBA 05: FALLIDA] El trigger no impidió asignar saldo negativo a la cuenta.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 06 [TRIGGER AUDITORÍA]: Disparo de trg_auditar_transacciones_sensibles
-- Objetivo: Comprobar que al insertar un evento de EVASIÓN, el disparador genera
--           automáticamente el registro correspondiente en AUDITORIA_TRANSACCION.
-- =============================================================================
DO $$
DECLARE
    v_id_tx BIGINT;
    v_conteo_auditoria INT;
    v_motivo_auditado VARCHAR;
    v_ticket_evasion VARCHAR;
BEGIN
    -- Consecutivo dinámico para evitar colisiones en ejecuciones repetidas
    v_ticket_evasion := 'TCK-EVA-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Insertar un evento de evasión vehicular
    INSERT INTO TRANSACCION_PEAJE (
        id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa,
        metodo_pago, numero_ticket, estado_paso
    ) VALUES (
        1, 1, 1, 'EVA999', 10500.00, 'EFECTIVO', v_ticket_evasion, 'EVASION'
    ) RETURNING id_transaccion INTO v_id_tx;

    -- Verificar que el trigger insertó en AUDITORIA_TRANSACCION
    SELECT COUNT(*), MAX(motivo)
    INTO v_conteo_auditoria, v_motivo_auditado
    FROM AUDITORIA_TRANSACCION
    WHERE id_transaccion = v_id_tx;

    IF v_conteo_auditoria = 1 AND v_motivo_auditado LIKE '%ALERTA DE EVASIÓN%' THEN
        RAISE NOTICE '[PRUEBA 06: EXITOSA - TRIGGER AUDITORÍA] Evasión auditada automáticamente. Motivo: "%"', v_motivo_auditado;
    ELSE
        RAISE EXCEPTION '[PRUEBA 06: FALLIDA] No se auditó automáticamente la transacción de evasión.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 07 [TRIGGER INMUTABILIDAD]: Protección Append-Only de Auditoría
-- Objetivo: Validar que trg_auditoria_inmutable prohíbe cualquier borrado forense.
-- =============================================================================
DO $$
DECLARE
    v_inmutable BOOLEAN := FALSE;
BEGIN
    BEGIN
        DELETE FROM AUDITORIA_TRANSACCION WHERE id_auditoria = 1;
    EXCEPTION
        WHEN OTHERS THEN
            v_inmutable := TRUE;
            RAISE NOTICE '[PRUEBA 07: EXITOSA - INMUTABILIDAD] trg_auditoria_inmutable rechazó DELETE: "%"', SQLERRM;
    END;

    IF NOT v_inmutable THEN
        RAISE EXCEPTION '[PRUEBA 07: FALLIDA] Se permitió modificar o eliminar un registro de auditoría legal.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 08 [NORMAL]: Cierre y Arqueo Cuadrado de Turno de Recaudo
-- Objetivo: Liquidar un turno operativo mediante pr_cerrar_arqueo_turno declarando
--           la cifra exacta recaudada en el sistema.
-- =============================================================================
DO $$
DECLARE
    v_id_turno BIGINT;
    v_diferencia NUMERIC(12,2);
    v_total_sistema NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_tck1 VARCHAR;
    v_tck2 VARCHAR;
BEGIN
    v_tck1 := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');
    v_tck2 := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Crear un turno temporal para prueba de cierre
    INSERT INTO TURNO (id_caseta, id_operador, fecha, diurno, fondo_inicial_caja, estado)
    VALUES (1, 5, CURRENT_DATE, TRUE, 50000.00, 'ABIERTO')
    RETURNING id_turno INTO v_id_turno;

    -- Simular dos transacciones en efectivo aprobadas en el turno
    INSERT INTO TRANSACCION_PEAJE (id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, estado_paso)
    VALUES (v_id_turno, 1, 1, 'HKL123', 10500.00, 'EFECTIVO', v_tck1, 'APROBADO'),
           (v_id_turno, 1, 1, 'UYT890', 10500.00, 'EFECTIVO', v_tck2, 'APROBADO');

    -- Efectuar el cierre declarando exactamente $21.000 COP
    CALL pr_cerrar_arqueo_turno(
        p_id_turno           := v_id_turno,
        p_efectivo_declarado := 21000.00,
        p_diferencia         := v_diferencia,
        p_total_sistema      := v_total_sistema,
        p_estado_cierre      := v_estado
    );

    IF v_estado = 'CERRADO' AND v_diferencia = 0.00 AND v_total_sistema = 21000.00 THEN
        RAISE NOTICE '[PRUEBA 08: EXITOSA - CIERRE CUADRADO] Turno ID % cerrado con diferencia $0.00 COP.', v_id_turno;
    ELSE
        RAISE EXCEPTION '[PRUEBA 08: FALLIDA] Discrepancia en liquidación del turno.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 09 [CASO LÍMITE / DESCUADRE]: Cierre con Faltante de Efectivo
-- Objetivo: Validar que pr_cerrar_arqueo_turno registre correctamente la diferencia
--           negativa (faltante) y actualice el turno.
-- =============================================================================
DO $$
DECLARE
    v_id_turno BIGINT;
    v_diferencia NUMERIC(12,2);
    v_total_sistema NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_tck VARCHAR;
BEGIN
    v_tck := 'TCK-ARQ-' || LPAD(nextval('seq_numero_ticket')::TEXT, 6, '0');

    -- Crear turno temporal
    INSERT INTO TURNO (id_caseta, id_operador, fecha, diurno, fondo_inicial_caja, estado)
    VALUES (2, 6, CURRENT_DATE, TRUE, 50000.00, 'ABIERTO')
    RETURNING id_turno INTO v_id_turno;

    -- Transacción en efectivo por $22.000 COP
    INSERT INTO TRANSACCION_PEAJE (id_turno, id_tarifa, id_categoria, placa_detectada, monto_tarifa, metodo_pago, numero_ticket, estado_paso)
    VALUES (v_id_turno, 4, 4, 'RTY654', 22000.00, 'EFECTIVO', v_tck, 'APROBADO');

    -- El operador entrega en físico solo $20.000 COP (Faltante de $2.000)
    CALL pr_cerrar_arqueo_turno(
        p_id_turno           := v_id_turno,
        p_efectivo_declarado := 20000.00,
        p_diferencia         := v_diferencia,
        p_total_sistema      := v_total_sistema,
        p_estado_cierre      := v_estado
    );

    IF v_estado = 'CERRADO' AND v_diferencia = -2000.00 THEN
        RAISE NOTICE '[PRUEBA 09: EXITOSA - DESCUADRE REGISTRADO] Turno ID % liquidado con Faltante de $ % COP.', v_id_turno, ABS(v_diferencia);
    ELSE
        RAISE EXCEPTION '[PRUEBA 09: FALLIDA] No se registró correctamente el descuadre negativo.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 10 [PROCESO CON CURSOR Y EXCEPCIONES]: Ejecución Batch Nocturna
-- Objetivo: Recorrer todas las cuentas con CURSOR explícito, clasificar saldos
--           críticos y aplicar suspensiones de cuentas en $0.
-- =============================================================================
DO $$
DECLARE
    v_tot INT;
    v_opt INT;
    v_cri INT;
    v_sus INT;
    v_err INT;
BEGIN
    CALL pr_proceso_nocturno_monitoreo_cuentas(v_tot, v_opt, v_cri, v_sus, v_err);

    IF v_tot >= 10 AND v_err = 0 THEN
        RAISE NOTICE '[PRUEBA 10: EXITOSA - CURSOR BATCH] Proceso iteró % cuentas sin errores no controlados.', v_tot;
    ELSE
        RAISE EXCEPTION '[PRUEBA 10: FALLIDA] Falló la ejecución del cursor o no procesó las cuentas esperadas.';
    END IF;
END;
$$;


-- =============================================================================
-- PRUEBA 11 [BONUS - FUNCIONES Y RECARGA]: Recarga y Reactivación de Cuenta
-- Objetivo: Validar pr_recargar_saldo_telepeaje y fn_validar_aptitud_telepeaje
-- =============================================================================
DO $$
DECLARE
    v_nuevo_saldo NUMERIC(12,2);
    v_estado VARCHAR(20);
    v_apto BOOLEAN;
BEGIN
    -- Asegurar precondición: cuenta suspendida y con saldo $0
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 0.00, estado_cuenta = 'SUSPENDIDA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';

    -- Recargar $50.000 a la cuenta asociada al TAG-COL-9900112238 (estaba suspendida)
    CALL pr_recargar_saldo_telepeaje(
        p_tag_o_placa   := 'TAG-COL-9900112238',
        p_monto_recarga := 50000.00,
        p_nuevo_saldo   := v_nuevo_saldo,
        p_estado_final  := v_estado
    );

    v_apto := fn_validar_aptitud_telepeaje('TAG-COL-9900112238', 31500.00);

    IF v_estado = 'ACTIVA' AND v_nuevo_saldo >= 50000.00 AND v_apto = TRUE THEN
        RAISE NOTICE '[PRUEBA 11: EXITOSA - RECARGA Y APTITUD] Cuenta reactivada y apta para telepeaje.';
    ELSE
        RAISE EXCEPTION '[PRUEBA 11: FALLIDA] La cuenta no fue reactivada tras la recarga.';
    END IF;

    -- Restaurar estado suspendido original para mantener aislamiento total en futuras ejecuciones
    UPDATE CUENTA_TELEPEAJE
    SET saldo_disponible = 0.00, estado_cuenta = 'SUSPENDIDA'
    WHERE tag_rfid_serial = 'TAG-COL-9900112238';
END;
$$;

DO $$
BEGIN
   RAISE NOTICE '=============================================================================';
   RAISE NOTICE 'TODAS LAS PRUEBAS DE LA MATRIZ FUERON EJECUTADAS CON RESULTADO CONFORME';
   RAISE NOTICE '=============================================================================';
END $$;
