# Limitaciones conocidas

Decisiones de diseño y límites que el equipo conoce y que conviene tener presentes en la sustentación. Las marcadas como **A revisar** son decisiones abiertas; ninguna se ha cambiado en el código.

## Base de datos y auditoría

1. **Auditoría de los pasos EXENTO.** El INSERT en `AUDITORIA_TRANSACCION` de los pasos exentos lo hace el trigger de la entrega de BD con `CURRENT_USER`, así que guarda `postgres` y no el código del recaudador. El `VOID` de las anulaciones sí guarda el código del empleado. (A revisar: solo se arreglaría tocando el trigger.)
2. **Resumen diario: día UTC frente a día de Bogotá.** La vista `vw_resumen_diario_estacion` de la entrega agrupa por día UTC y cuenta las anuladas, porque es anterior a la anulación. La API calcula el recaudo por día civil de Bogotá (UTC-5) y excluye las anuladas. Por eso un cobro entre las 19:00 y las 24:00 hora Colombia aparece en días distintos en la vista y en la API.
3. **Las anuladas siguen como APROBADO.** El DDL de la entrega no tiene el estado `ANULADO`, así que una transacción anulada permanece en `TRANSACCION_PEAJE` como `APROBADO`; la anulación queda registrada como `VOID` en `AUDITORIA_TRANSACCION`. Toda consulta de recaudo debe excluir las transacciones con `VOID`.

## API y seguridad

4. **Tarifas sin autenticación. A revisar.** `GET /api/tarifas` y `GET /api/tarifas/vigente` no requieren autenticación: `TarifasController` no tiene `[Authorize]` a nivel de clase y solo `POST` y `PATCH` exigen la política de administrador. Las tarifas son datos de consulta pública en un peaje, pero conviene decidir si se exige token. Lo mismo ocurre con los `GET` de estaciones, categorías y casetas.
5. **Cambio de contraseña.** No hay endpoint para que un operador cambie su propia contraseña. Lo hace el administrador desde el panel de Personal.

## Modo mocks

6. **Cualquier contraseña vale en mocks.** Con `pnpm dev:mocks` el login acepta cualquier contraseña no vacía, porque MSW no verifica BCrypt. Solo ocurre en ese modo; la API real siempre valida contra la base.
