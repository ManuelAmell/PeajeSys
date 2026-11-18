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
-- ARCHIVO: 03_PLSQL/03_Triggers_PeajeSys.sql
-- DESCRIPCIÓN: Implementación de Disparadores (Triggers) de Reglas de Negocio,
--              Auditoría Automática y Validación Financiera en PostgreSQL (PL/pgSQL).
--              Cumple con el Numeral 4.2 de la Guía Oficial:
--              - Al menos 2 triggers asociados a reglas reales del negocio,
--                auditoría, validación o actualización automática.
--              - Justificación técnica y de negocio de su ejecución en el SGBD.
-- =============================================================================

-- =============================================================================
-- TRIGGER 1: trg_prevenir_saldo_negativo_telepeaje
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En sistemas de recaudo electrónico vial por telepeaje (RFID), las cuentas prepago
-- manejan recursos monetarios reales de usuarios y concesiones. Si se permitiera
-- saldo negativo por desincronización o fallos en aplicaciones externas, la concesión
-- incurriría en pérdidas de cartera difíciles de cobrar.
-- Delegar esta regla en un TRIGGER a nivel de motor de base de datos asegura que
-- NINGUNA instrucción (sea UPDATE manual de un administrador, servicio REST o script batch)
-- pueda vulnerar la restricción financiera de saldo no negativo, garantizando integridad
-- transaccional ACID bajo concurrencia.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_prevenir_saldo_negativo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.saldo_disponible < 0.00 THEN
        RAISE EXCEPTION 'Violación de Regla Financiera: El saldo de la cuenta de telepeaje ID % (Placa %) no puede ser inferior a $0.00 COP. Saldo intentado: $ % COP.',
            NEW.id_cuenta, NEW.placa_vehiculo, NEW.saldo_disponible
            USING ERRCODE = 'P0040';
    END IF;

    -- Si el saldo llega exactamente a cero y la cuenta estaba activa, marcar aviso
    IF NEW.saldo_disponible = 0.00 AND OLD.saldo_disponible > 0.00 THEN
        RAISE NOTICE 'Aviso de Saldo Agotado: La cuenta de telepeaje ID % (Placa %) ha quedado en $0.00 COP.',
            NEW.id_cuenta, NEW.placa_vehiculo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevenir_saldo_negativo ON CUENTA_TELEPEAJE;
CREATE TRIGGER trg_prevenir_saldo_negativo
BEFORE UPDATE OF saldo_disponible ON CUENTA_TELEPEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_prevenir_saldo_negativo();


-- =============================================================================
-- TRIGGER 2: trg_auditar_transacciones_sensibles
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En las concesiones viales, los eventos excepcionales como evasiones de peaje
-- (vehículos que rompen la barrera o cruzan pegados sin pagar) y los pasos exentos
-- (ambulancias, bomberos, caravanas presidenciales) representan riesgos de fuga de
-- capital o fraude.
-- Este trigger audita de manera 100% automática e invisible en la tabla inmutable
-- AUDITORIA_TRANSACCION cada vez que se inserta un evento de evasión o exención,
-- registrando el usuario del sistema, fecha/hora y detalle del incidente para
-- posterior revisión de supervisión y fiscalización legal.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_auditar_transacciones_sensibles()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso A: Registro de una EVASIÓN
    IF NEW.estado_paso = 'EVASION' THEN
        INSERT INTO AUDITORIA_TRANSACCION (
            id_transaccion, tipo_operacion, usuario_sistema, fecha_hora_evento, motivo
        ) VALUES (
            NEW.id_transaccion,
            'INSERT',
            CURRENT_USER,
            NOW(),
            'ALERTA DE EVASIÓN: Vehículo placa "' || COALESCE(NEW.placa_detectada, 'NO_DETECTADA') || 
            '" cruzó el carril del turno ' || NEW.id_turno || ' sin registrar pago.'
        );
    -- Caso B: Registro de un paso EXENTO de pago
    ELSIF NEW.metodo_pago = 'EXENTO' OR NEW.estado_paso = 'EXENTO' THEN
        INSERT INTO AUDITORIA_TRANSACCION (
            id_transaccion, tipo_operacion, usuario_sistema, fecha_hora_evento, motivo
        ) VALUES (
            NEW.id_transaccion,
            'INSERT',
            CURRENT_USER,
            NOW(),
            'Paso Exento Autorizado: Vehículo placa "' || COALESCE(NEW.placa_detectada, 'OFICIAL') || 
            '" exonerado bajo tarifa reglamentaria de $0.00 COP.'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditar_transacciones_sensibles ON TRANSACCION_PEAJE;
CREATE TRIGGER trg_auditar_transacciones_sensibles
AFTER INSERT ON TRANSACCION_PEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_auditar_transacciones_sensibles();


-- =============================================================================
-- TRIGGER 3 (Adicional): trg_acumular_recaudo_efectivo_turno
-- =============================================================================
-- JUSTIFICACIÓN DE NEGOCIO Y TÉCNICA:
-- En una caseta manual de peaje, mantener la sincronización en tiempo real del
-- total de dinero recaudado en efectivo dentro de la tabla TURNO es fundamental.
-- Este disparador actualiza automáticamente el acumulador en la cabecera del turno
-- cada vez que se inserta una transacción en efectivo aprobada, evitando discrepancias
-- de cálculo entre el detalle y la cabecera y liberando a la capa de aplicación
-- de realizar múltiples sentencias UPDATE concurrentes.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_acumular_recaudo_efectivo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.metodo_pago = 'EFECTIVO' AND NEW.estado_paso = 'APROBADO' THEN
        UPDATE TURNO
        SET total_recaudado_efectivo = COALESCE(total_recaudado_efectivo, 0.00) + NEW.monto_tarifa
        WHERE id_turno = NEW.id_turno;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acumular_recaudo_efectivo ON TRANSACCION_PEAJE;
CREATE TRIGGER trg_acumular_recaudo_efectivo
AFTER INSERT ON TRANSACCION_PEAJE
FOR EACH ROW
EXECUTE FUNCTION fn_trg_acumular_recaudo_efectivo();


-- =============================================================================
-- TRIGGER 4 (Auditoría Inmutable):
-- Garantiza que los registros de AUDITORIA_TRANSACCION no puedan ser alterados
-- ni eliminados por ningún usuario, asegurando valor probatorio forense.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operación denegada: La tabla AUDITORIA_TRANSACCION es estrictamente de solo lectura/inserción (append-only) para garantizar trazabilidad legal y fiscal.'
        USING ERRCODE = 'P0045';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_inmutable ON AUDITORIA_TRANSACCION;
CREATE TRIGGER trg_auditoria_inmutable
BEFORE UPDATE OR DELETE ON AUDITORIA_TRANSACCION
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_audit_modification();
