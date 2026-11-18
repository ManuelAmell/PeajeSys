# Stack del frontend — PeajeSys

Decidido el 2026-11-18. El backend en C#/.NET queda en espera hasta que llegue la especificación; mientras tanto el front trabaja contra una API simulada que respeta el esquema de `database/01_DDL_PeajeSys.sql`.

## Decisiones

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Lenguaje | TypeScript (estricto) | Ya fijado en el README del proyecto. |
| Framework | React + Vite | Lo que exporta Claude Design se lleva directo al código. |
| Estilos y componentes | Tailwind CSS + shadcn/ui | Componentes accesibles que viven en el repo y se personalizan. |
| Gestor de paquetes | pnpm | Más rápido y con menos disco; cada integrante lo instala una vez (`npm i -g pnpm` o `corepack enable`). |
| Datos sin backend | API simulada tipada con MSW | Los tipos salen de las tablas del DDL y los datos de prueba de `02_DML_Datos_PeajeSys.sql`. Cuando exista el backend solo cambia la URL base. |
| Autenticación | Login simulado por rol | Usuarios de prueba (operadores del DML, un supervisor y un administrador); el rol decide el menú. Luego se conecta al auth del backend. |
| Tema | Claro y oscuro (sigue al sistema, con botón para cambiar) | Pedido del equipo el 2026-11-18; paleta oscura con contraste AA y siluetas sobre placa clara. |
| Dispositivo | Escritorio adaptable | Pensado para 1280 px o más, usable en tableta; la pantalla del operador usa botones grandes. |
| Diseño | Claude Design: sistema de diseño → pantallas | Primero colores, tipografía y componentes; luego cada pantalla, empezando por la del operador. |
| Filtro de calidad visual | Skill `antislop` en modo *durante* | Se aplica mientras se diseña el front y cada entrega pasa su Delivery Gate ([anti-slop](https://github.com/miqdadbadjuber/anti-slop)). |

## Alcance de la primera versión

- **Operador de caseta**: abrir y cerrar turno, registrar el paso del vehículo, cobrar en efectivo o por telepeaje, emitir el ticket.
- **Supervisor de estación**: arqueo y cuadre de turnos, recaudo diario por estación y por carril, descuadres y auditoría.
- **Administrador**: CRUD de estaciones, casetas, operadores, categorías y tarifas.

Fuera de esta versión: el portal del usuario de telepeaje (consulta de saldo y recargas).

## Librerías de apoyo propuestas (por confirmar al crear el proyecto)

- Rutas: React Router.
- Datos remotos y caché: TanStack Query.
- Formularios y validación: React Hook Form + Zod (los esquemas Zod replican los `CHECK` del DDL).
- Pruebas: Vitest + Testing Library (unidad) y Playwright (extremo a extremo).
- Calidad: ESLint + Prettier.

## Contrato con el backend

La capa `src/api/` expone funciones tipadas (por ejemplo `getTurnos()`, `registrarPaso()`), y la UI nunca hace `fetch` directo. Los nombres de los campos siguen las columnas del DDL en `snake_case` hasta que el equipo de backend publique sus DTO; ese cambio se hace en un solo lugar.
