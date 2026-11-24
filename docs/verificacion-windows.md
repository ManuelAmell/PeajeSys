# Verificación en Windows

Checklist de 5 pasos para que un compañero con Windows compruebe que el proyecto se clona y funciona en un clon nuevo. Todo en **PowerShell**. Requisitos: los del [Inicio rápido](../README.md#-inicio-r%C3%A1pido) (Git, Docker Desktop abierto, .NET SDK 8 o superior, Node 20 o superior, `corepack enable`).

Si un paso falla, copia y envía lo que se indica en "Si falla" (texto, no capturas) junto con la salida de `systeminfo | Select-String "OS Name","OS Version"`, `dotnet --version`, `node --version` y `git --version`.

## 1. Saltos de línea y clon

```powershell
git config core.autocrlf
cd $HOME
git clone https://github.com/ManuelAmell/PeajeSys.git peajesys-verif
cd peajesys-verif
git ls-files --eol | Select-String crlf
```

- **Esperado**: `git config core.autocrlf` muestra `true`, `false` o nada (da igual: `.gitattributes` fuerza LF). El último comando **no imprime nada**.
- **Si falla**: copia la salida de `git config core.autocrlf` y las primeras 20 líneas de `git ls-files --eol | Select-String crlf`.

## 2. Instalar y base de datos

```powershell
corepack enable
pnpm install
pnpm db
docker compose ps
```

- **Esperado**: `pnpm install` termina sin errores e instala también el frontend. Repite `docker compose ps` hasta que el servicio `db` diga `healthy` (la primera vez tarda uno o dos minutos).
- **Si falla**: la salida completa de `pnpm install` o de `pnpm db`, y `docker compose logs db`. Si el puerto 5432 está ocupado, usa la sección de solución de problemas del README.

## 3. Aplicación y un cobro

```powershell
pnpm dev
```

- **Esperado**: aparecen las líneas `api` y `web`; <http://localhost:5180> carga. Entra con los tres roles (cierra sesión entre uno y otro): `ADM-001` / `Manuel2026*` (administrador), `SUP-001` / `Samuel2026*` (supervisor) y `REC-001` / `Alex2026*` (recaudador). Con el recaudador abre un turno, registra un cobro en efectivo y comprueba que aparece en el resumen. Detén con `Ctrl+C`.
- **Si falla**: las últimas 40 líneas de la terminal de `pnpm dev`, el rol y el paso donde se detuvo, y el resultado de `netstat -ano | findstr ":5080"` y `findstr ":5180"` tras el `Ctrl+C` (los puertos deben quedar libres).

## 4. Pruebas

```powershell
pnpm test
cd frontend
pnpm exec playwright install chromium
pnpm e2e
cd ..
```

- **Esperado**: `pnpm test` termina en verde (backend unas 405 pruebas y Vitest unas 465; consulta `pendientes.md` para los totales actuales). `pnpm e2e` da `70 passed`.
- **Si falla**: el resumen final (`Passed`/`Failed`) y el nombre y error de las pruebas que fallen, de `dotnet test` o de Vitest o de Playwright.

## 5. Capturas (spawn de pnpm y cierre de procesos)

```powershell
pnpm --dir frontend build:mocks
pnpm --dir frontend capturar -- --ruta /login --rol ninguno --espera h1 --salida ./capturas/verif/
Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue
```

- **Esperado**: puede mostrar una advertencia sobre el selector `h1` genérico: es normal. El script inicia solo su servidor de vista previa, genera 4 PNG (claro y oscuro, escritorio y móvil) en `frontend\capturas\verif`, imprime la tabla resumen y termina. El último comando **no muestra nada**: el servidor que lanzó el script se cerró.
- **Si falla**: la salida completa del comando `capturar` y la del último comando (si muestra un proceso, anota su `OwningProcess`).

---

Al terminar, borra el clon (`cd $HOME; Remove-Item -Recurse -Force peajesys-verif`) y `docker compose down -v` si lo hiciste dentro de él antes de borrarlo. Envía el resultado de cada paso (OK o el texto de "Si falla") a quien coordina el proyecto.
