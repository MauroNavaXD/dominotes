# Pipeline de calidad y seguridad para validar.sh / validar.bat

Este cambio añade cuatro verificaciones al pipeline de validación: auditoría de dependencias (`npm audit --audit-level=high`), ESLint de Angular (flat config vía `ng add angular-eslint`), tests unitarios en modo single-run (`ng test --watch=false`) y un build de producción de verificación (`ng build --configuration production`). Los cuatro pasos quedan expuestos como scripts npm y se integran en `validar.sh` y `validar.bat` en el orden auditoría → ESLint → tipado → formato → tests → build, parando al primer fallo. El `lint` original (typecheck + format) no se eliminó: ahora es el agregado `lint:eslint && typecheck && format:check`. No se modificó código de la app ni dependencias para pasar las verificaciones.

**Watch for:** el commit reporta que `audit`, `typecheck`, `format:check` y `build:check` fallan hoy (EXIT ≠ 0) por estado pre-existente del repo (vuln HIGH en vite, y un TS2741 de la feature due-date a medias) — **confirmed** por la evidencia del commit. Eso significa que `validar.sh`/`validar.bat` fallan en el primer paso (auditoría) tal como está el repo; es comportamiento esperado de la infraestructura, no un defecto de este cambio, pero conviene tenerlo presente al correrlo.

**Verdict**: APPROVED

## High-level view

El pipeline se estructura como una cadena de scripts npm encadenados por los dos scripts de shell. Cada verificación vive en su propio script (`audit`, `lint:eslint`, `typecheck`, `format:check`, `test:ci`, `build:check`), de modo que los scripts de shell solo orquestan el orden y el corte temprano. El criterio de orden pedido (auditoría → eslint → typecheck → format:check → test:ci → build:check) se cumple exactamente en ambos scripts.

El corte al primer fallo está resuelto distinto en cada plataforma pero con el mismo efecto. En `validar.sh` se usa `set -euo pipefail` más un `trap ... ERR` que imprime el mensaje en español y el tip de `npm run format`; el trap no hace `exit` propio, así que el script sale con el código del comando que falló (verificado: el trap corre y el estado de salida sigue siendo ≠ 0). En `validar.bat` cada paso lleva `if errorlevel 1 goto :error`, saltando a un bloque `:error` que sale con `exit /b 1`.

ESLint entra con la configuración estándar que genera `ng add angular-eslint`: flat config en `eslint.config.js`, bloque para `**/*.ts` con las reglas recomendadas de ESLint/typescript-eslint/angular más los selectores `app`, y bloque para `**/*.html` con las reglas de template y accesibilidad. El target `lint` en `angular.json` apunta a `@angular-eslint/builder:lint` con `lintFilePatterns` sobre `src/**/*.ts` y `src/**/*.html`, por lo que `ng lint` (y por tanto `npm run lint:eslint`) queda accesible y cubre lo pedido. No hubo refactor forzado de la app: el commit reporta `lint:eslint -> EXIT 0`.

La superficie de scripts npm nueva es `build:check`, `test:ci`, `audit` y `lint:eslint`, y el `lint` compuesto. El único punto de fricción de diseño es que el pipeline falla hoy por causas pre-existentes (dependencia vulnerable y un typecheck roto por la feature due-date incompleta), no por la infraestructura añadida.

<details>
<summary>Issues (1)</summary>

1. **Pipeline falla por estado pre-existente** — `validar.sh`/`validar.bat` cortan en el paso de auditoría (vuln HIGH en vite) y también fallarían en typecheck/format:check/build:check por el TS2741 de due-date y 7 archivos sin formatear. No es un defecto de este cambio; informativo para quien corra el pipeline. Acción opcional: `npm audit fix` y completar la feature due-date / `npm run format` fuera del alcance de esta tarea.

</details>

<details>
<summary>Details</summary>

### Orden del pipeline y corte al primer fallo

Ambos scripts ejecutan exactamente auditoría → ESLint → tipado → formato → tests → build. En `validar.sh` cada paso es una llamada `npm run <script>` sin guardas explícitas porque `set -e` corta en el primer comando con estado ≠ 0; el `trap error_handler ERR` imprime el banner en español y el tip de `npm run format` antes de que el script salga. El handler no invoca `exit`, pero bajo `set -e` el script igual termina con el código del comando fallido — verificado con un caso mínimo (`false` dispara el trap y el proceso sale con EXIT 1). Esto coincide con la evidencia del commit: `bash scripts/validar.sh` se detiene en Auditoría con EXIT 1.

`validar.bat` logra el mismo corte con `if errorlevel 1 goto :error` después de cada `call npm run ...`, y el bloque `:error` sale con `exit /b 1`. Las etiquetas van más allá del mínimo pedido (`[AUDIT]`, `[LINT]`, `[TEST]`, `[BUILD]`): están presentes esas cuatro y además `[TYPE]` y `[FMT]`, manteniendo paridad 1:1 con los pasos de la versión shell.

Ambos hacen `cd` a la raíz del proyecto antes de ejecutar nada: `cd "$(dirname "$0")/.."` en shell y `cd /d "%~dp0.."` en batch, de modo que funcionan invocados desde la carpeta `frontend` (`./scripts/validar.sh` o `scripts\validar.bat`).

### ESLint flat config y target de Angular

`eslint.config.js` es la salida canónica de `ng add angular-eslint`: bloque `**/*.ts` que extiende recommended de ESLint/typescript-eslint/angular más selectores `app`, y bloque `**/*.html` con `templateRecommended` + `templateAccessibility`, usando `angular.processInlineTemplates`. No hay reglas desactivadas para forzar que la app pase, y el commit reporta `lint:eslint -> EXIT 0`, consistente con que no hubo refactor de la app. El target `lint` en `angular.json` usa `@angular-eslint/builder:lint` con `lintFilePatterns: ["src/**/*.ts", "src/**/*.html"]`, por lo que `ng lint`/`npm run lint:eslint` cubre `.ts` y `.html` de `src/`.

### Scripts npm y preservación del lint original

El riesgo a descartar aquí era perder el `lint` original (typecheck + format:check). No se perdió: se amplió a `lint:eslint && npm run typecheck && npm run format:check`, manteniendo las dos verificaciones previas y sumando ESLint al frente. `format:check` conserva el mismo glob Prettier de antes. Los demás scripts nuevos coinciden con el criterio: `test:ci` es single-run (`ng test --watch=false`), `build:check` es build de producción, `audit` usa `--audit-level=high`.

### Postura de seguridad: auditoría como primer gate

La auditoría es el primer paso del pipeline, lo que hace fail-fast ante una dependencia vulnerable antes de gastar tiempo en lint/test/build. El nivel `--audit-level=high` corta solo en HIGH/CRITICAL, dejando pasar moderadas/bajas — decisión razonable para no bloquear por ruido. La contrapartida, ya señalada en el commit, es que hoy mismo existe una vuln HIGH en vite (transitiva vía `@angular/build`), por lo que el pipeline se detiene en este primer paso hasta que se aplique `npm audit fix` o se resuelva la transitiva. Es exactamente el comportamiento de seguridad buscado; queda como nota para quien ejecute, no como defecto del cambio.

</details>

<details>
<summary>Mapa de archivos</summary>

- `package.json` — nuevos scripts `audit`, `test:ci`, `build:check`, `lint:eslint`; `lint` recompuesto; devDeps de angular-eslint/eslint/typescript-eslint/@eslint/js.
- `eslint.config.js` — nuevo flat config (bloques `.ts` y `.html`, reglas angular-eslint + accesibilidad).
- `angular.json` — target `lint` (`@angular-eslint/builder:lint`) y `schematicCollections`.
- `scripts/validar.sh` — `set -euo pipefail`, trap ERR en español, pipeline de 6 pasos.
- `scripts/validar.bat` — pipeline equivalente con etiquetas `[AUDIT]/[LINT]/[TYPE]/[FMT]/[TEST]/[BUILD]` y `goto :error`.
- `package-lock.json` — árbol de dependencias de las herramientas nuevas.

Diff completo: `git show 50e2895`.

</details>
