# Pendientes — PeajeSys (Avance 3, corte 3)

Actualizado el 2026-11-18. Por ahora el equipo trabaja **solo en el frontend**. El resto queda pendiente hasta que llegue el material de PL/pgSQL y los detalles del backend.

## 🖥️ En curso: frontend

Flujo acordado: primero **todos los diseños** en Claude Design; cuando el equipo los apruebe, el código se hace en **Orca** con un agente orquestador y sus agentes.

- [x] Imágenes de Gemini procesadas en `docs/diseno/procesadas/` (logo, isotipo, favicons, 7 siluetas, foto del login).
- [x] Sistema de diseño con la paleta vial (borrador para revisión).
- [x] Terminal de cobro del operador (borrador interactivo para revisión).
- [x] Inicio de sesión por rol (borrador interactivo).
- [x] Panel del supervisor: arqueo y conciliación de turnos, recaudo diario, auditoría y cuentas de telepeaje (borrador interactivo).
- [x] Panel del administrador: tarifas con historial, personal, estaciones y casetas, categorías (borrador interactivo).
- [x] Aprobación de todos los diseños (2026-11-18), con tema claro y oscuro. Fuentes en `docs/diseno/claude-design/`.
- [ ] Especificación para el orquestador lista en `/home/amell/orca/reportes/TAREA-PEAJESYS-FRONTEND.md` (bloques B0 a B6). Falta lanzarla desde Orca.
- [ ] Código en Orca: esqueleto en `frontend/` (React + Vite + TS, Tailwind + shadcn/ui, pnpm, MSW). Stack en [docs/stack-frontend.md](docs/stack-frontend.md).
- [ ] Código en Orca: login simulado por rol y pantallas de operador, supervisor y administrador según los diseños aprobados.

## ⏳ Pendiente: entregables obligatorios de la guía (sección 4.2)

1. [ ] **Versión final consolidada del modelo y los scripts SQL**, con las correcciones de los cortes anteriores, que permita reconstruir la base completa.
   - Los scripts 01–04 del Avance 2 corren sin errores en PostgreSQL 18.7 (probado el 2026-11-18). Falta probar `00_Master_PeajeSys.sql` en una base limpia.
   - **Inconsistencia en los datos (verificada el 2026-11-18):** en los turnos 1, 2, 4, 5 y 6, `TURNO.total_recaudado_efectivo` no coincide con la suma de sus transacciones en efectivo (por ejemplo, el turno 5 dice $ 420.000 y sus pasos suman $ 48.500). Afecta el criterio "integración y consistencia" (25 %). Corregir el DML o calcular el total desde las transacciones (buen candidato para el bloque con cursor de conciliación).
   - El DML no trae ningún usuario con rol de administrador (`OPERADOR.rol` solo tiene RECAUDADOR y SUPERVISOR) y la estación La Ceballos solo tiene tarifas para las categorías I a III.
   - Revisar: el ticket `TCK-20261006-00019` del DML toma la fecha de hoy aunque su número dice 6 de octubre; el día de la semana sale en inglés; el `EXPLAIN` del índice muestra `Seq Scan` porque la tabla es pequeña.
2. [ ] **Bloque PL/pgSQL con cursor y manejo de excepciones**: un proceso que recorra varias filas, aplique lógica y gestione errores previsibles, ligado a una necesidad real del proyecto.
3. [ ] **Al menos 2 procedimientos almacenados** con parámetros pertinentes y lógica no trivial.
4. [ ] **Al menos 2 funciones almacenadas** que devuelvan resultados útiles para cálculos, validaciones o consultas del negocio.
5. [ ] **Al menos 2 triggers** asociados a reglas reales del negocio (auditoría, validación o actualización automática), justificando por qué conviene ejecutarlos en la base de datos.
6. [ ] **Manejo de excepciones** en los bloques y subprogramas, predefinidas o personalizadas, con mensajes controlados.
7. [ ] **Matriz de pruebas** con al menos 10 casos (funcionamiento normal, límites y errores), indicando entrada/acción, resultado esperado y resultado obtenido.
8. [ ] **Documentación final**: descripción de la solución, arquitectura de datos, modelos, diccionario, decisiones importantes, scripts implementados y conclusiones técnicas.

## ⏳ Pendiente: backend

- [ ] Web API en C#/.NET. En espera de más detalles; mientras tanto el frontend usa una API simulada con MSW.
