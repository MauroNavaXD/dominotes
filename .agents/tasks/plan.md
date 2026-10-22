# Plan de implementación — Calidad y seguridad en los scripts de validación

Proyecto: Angular 22 (`@angular/core` 22.2.3, CLI 22.2.2), npm 11, Vitest (builder `@angular/build:unit-test`), Prettier, `tsc` para typecheck. Trabajar DIRECTAMENTE en `/Users/mau/Repositories/xaldigital/voi/capacitacion-kiro/dominotes/frontend` (NO worktree).

## Hallazgos de la exploración (decisiones fundamentadas)

Estos hallazgos se obtuvieron leyendo el código y no deben re-derivarse:

1. **Configuración de producción en `angular.json`**: el target `build` (builder `@angular/build:application`) tiene `configurations.production` (con `budgets` y `outputHashing: "all"`) y además `defaultConfiguration: "production"`. Por tanto `ng build` ya usa producción por defecto, pero se deja explícito `ng build --configuration production` para que la intención sea clara y robusta ante cambios futuros del default.

2. **Single-run de tests**: el builder de test es `@angular/build:unit-test` con `runner: vitest` (default). En su schema, `watch` "Defaults to `true` in TTY environments and `false` otherwise". Para garantizar una corrida única y determinista (incluso en una terminal TTY), el script `test:ci` debe forzar `--watch=false`. Decisión: `"test:ci": "ng test --watch=false"`. El spec existente (`src/app/app.spec.ts`) usa `vitest/globals` vía `tsconfig.spec.json`, así que la corrida única ya funciona con la config actual.

3. **ESLint / compatibilidad con Angular 22**: `angular-eslint` v22 soporta oficialmente Angular 22 + TS 6 (release 22.0.0: "update to Angular 22 + TS 6"). El paquete moderno y unificado es `angular-eslint` (ya NO `@angular-eslint/schematics` como paquete separado para el flujo CLI). El comando recomendado por el README oficial v22 es `ng add angular-eslint`, que al instalar la última versión queda alineada con el Angular major más reciente (22). Decisión: usar `ng add angular-eslint --skip-confirmation`. Esto instala `angular-eslint`, `typescript-eslint` y `eslint`, crea `eslint.config.js` (flat config), registra `"schematicCollections": ["angular-eslint"]` en `angular.json` y añade el target `lint` (architect `@angular-eslint/builder:lint`) accesible vía `ng lint`.
   - Contenido referenciado del README oficial de angular-eslint fue reformulado para cumplir restricciones de licencia.

4. **Colisión del script `lint`**: `package.json` ya define `"lint": "npm run typecheck && npm run format:check"`. El schematic de angular-eslint añade el target architect `lint` (para `ng lint`) pero NO sobrescribe el script npm `lint`. Decisión de reorganización sensata (sin perder nada):
   - Añadir `"lint:eslint": "ng lint"` (ESLint sobre .ts y .html de `src/`).
   - Mantener `"lint"` como alias agregador y ampliarlo: `"lint": "npm run lint:eslint && npm run typecheck && npm run format:check"`.
   - `validar.*` invocará `npm run lint:eslint` como paso dedicado de ESLint (y typecheck/format como pasos propios), para que el orden exacto solicitado sea explícito y el primer fallo detenga todo.

5. **Formato Prettier de configs nuevas**: `eslint.config.js` generado debe pasar `format:check`. Pero `format:check` corre sobre `src/**/*.{ts,html,css,json}`, NO sobre `eslint.config.js` (está en la raíz, no en `src/`), así que no lo afecta. `package.json` SÍ no está en el glob de `src/`, por lo que Prettier tampoco lo valida; aun así se editará a mano respetando el estilo (2 espacios, comillas dobles en JSON) para no romper nada. **Acción preventiva**: tras editar `package.json`, correr `npx prettier --write package.json eslint.config.js` para normalizar y luego `npm run format:check` para confirmar que `src/` sigue en orden.

6. **`.agents/` no está en `.gitignore`**: no afecta la tarea (el plan vive en `.agents/tasks/plan.md` por instrucción), pero el implementador debe evitar `git add -A`; agregar solo los archivos tocados por la tarea.

## Orden exacto de validación a integrar (parando al primer fallo)

`audit → eslint (lint:eslint) → typecheck → format:check → tests (test:ci) → build (build:check)`

---

## Pasos de implementación

- [ ] 1. Instalar y configurar ESLint vía schematic de Angular (no interactivo).
      Ejecutar desde la raíz del frontend: `npx ng add angular-eslint --skip-confirmation`.
      Esto instala `angular-eslint`, `typescript-eslint` y `eslint` en `devDependencies`, crea `eslint.config.js` (flat config) en la raíz, agrega `"cli": { "schematicCollections": ["angular-eslint"] }` y el target `lint` en `angular.json`, y actualiza `package-lock.json`.
      Archivos: `package.json`, `package-lock.json`, `angular.json`, `eslint.config.js` (nuevo).
      Verificar: `npx ng lint` corre y reporta resultados (debe EJECUTARSE sin crash). Registrar cuántos hallazgos (errors/warnings) reporta sobre el código existente.
      Nota de fallback: si `ng add angular-eslint` falla por incompatibilidad, ejecutar la versión pineada `npx ng add angular-eslint@22 --skip-confirmation`. Si aun así falla, pasar a configuración manual (ver paso 2). NO modificar código de la app para "arreglar" hallazgos de ESLint.

- [ ] 2. (Solo si el paso 1 falla) Configurar ESLint manualmente con flat config.
      Instalar exactamente: `npm install -D eslint@^9 angular-eslint@^22 typescript-eslint@^8` y crear `eslint.config.js` en la raíz con el contenido propuesto más abajo (sección "Contenido propuesto de eslint.config.js"). Añadir a mano el target `lint` en `angular.json` (`"lint": { "builder": "@angular-eslint/builder:lint", "options": { "lintFilePatterns": ["src/**/*.ts", "src/**/*.html"] } }`).
      Archivos: `package.json`, `package-lock.json`, `angular.json`, `eslint.config.js` (nuevo).
      Verificar: `npx ng lint` se ejecuta sin crash y reporta hallazgos.

- [ ] 3. Verificar/normalizar el contenido de `eslint.config.js` (flat config) para cubrir `.ts` y `.html` de `src/` con reglas recomendadas de angular-eslint.
      Comparar el `eslint.config.js` generado con el contenido propuesto abajo. Debe usar `angular-eslint` (configs recomendadas tseslint + angular templates), con selectores de componente/directiva en prefijo `app` (consistente con `angular.json` `"prefix": "app"`). NO endurecer reglas más allá de las recomendadas; el objetivo es dejar la infraestructura lista, no refactorizar la app.
      Archivos: `eslint.config.js`.
      Verificar: `npx ng lint` pasa o solo reporta hallazgos (no errores de configuración). Documentar el conteo de hallazgos en el resumen final.

- [ ] 4. Editar `package.json` para añadir los scripts nuevos y reorganizar `lint`.
      Aplicar exactamente las ediciones de la sección "Ediciones exactas de package.json" más abajo: añadir `audit`, `test:ci`, `build:check`, `lint:eslint`, y ampliar `lint`. Mantener el bloque `scripts` ordenado y con el estilo JSON existente (2 espacios, comillas dobles).
      Archivos: `package.json`.
      Verificar: `npm run audit` corre (falla solo ante high/critical); `npm run test:ci` corre una sola vez y termina; `npm run build:check` compila en modo producción; `npm run lint:eslint` ejecuta ESLint. Luego `npx prettier --write package.json eslint.config.js` y `npm run format:check` (debe seguir pasando sobre `src/`).

- [ ] 5. Reescribir `scripts/validar.sh` con el pipeline completo, `set -euo pipefail` y `trap` de error en español.
      Reemplazar el contenido por el de la sección "Contenido exacto de validar.sh" más abajo: `set -euo pipefail`, `cd` a la raíz, y los 6 pasos en orden (Auditoría, ESLint, Tipado, Formato, Tests, Build) con secciones y emojis; `trap` que ante error imprime mensaje claro en español con el tip de `npm run format`. Al ser `set -e`, cada `npm run ...` que falle detiene el script y dispara el trap.
      Archivos: `scripts/validar.sh`.
      Verificar: `bash scripts/validar.sh` desde la carpeta `frontend` ejecuta los 6 pasos en orden y termina con el mensaje de éxito (si todo pasa) o con el mensaje del trap al primer fallo. Mantener permisos de ejecución (`chmod +x scripts/validar.sh`).

- [ ] 6. Actualizar `scripts/validar.bat` con los pasos equivalentes y consistentes.
      Reemplazar el contenido por el de la sección "Contenido exacto de validar.bat" más abajo: mismos 6 pasos en el mismo orden con etiquetas `[AUDIT]`, `[LINT]`, `[TYPE]`, `[FMT]`, `[TEST]`, `[BUILD]`, cada uno con `if errorlevel 1 goto :error`, manteniendo el bloque `:error` existente con el tip de `npm run format`.
      Archivos: `scripts/validar.bat`.
      Verificar (en Windows / revisión manual): el orden y cobertura coinciden 1:1 con `validar.sh`; cada paso tiene su `if errorlevel 1 goto :error`. En macOS validar la coherencia por lectura (no se ejecuta `.bat`).

- [ ] 7. Actualizar la documentación de comandos npm en `README.md`.
      En la tabla "Comandos npm equivalentes" añadir filas para `audit` (`npm run audit`), `test:ci` (`npm run test:ci`), `build:check` (`npm run build:check`) y `lint:eslint` (`npm run lint:eslint`), y ajustar la descripción de `lint` a "ESLint + tipado + formato". Actualizar la descripción del paso "Validar" en la tabla de scripts para reflejar que ahora cubre auditoría, ESLint, tipado, formato, tests y build.
      Archivos: `README.md`.
      Verificar: `npm run format:check` sigue pasando (README no está en el glob de Prettier, pero no debe romper nada); revisión de que la tabla refleja los scripts reales de `package.json`.

- [ ] 8. Verificación integral final (ejecutar el pipeline completo end-to-end).
      Correr `bash scripts/validar.sh` desde `frontend` y confirmar que los 6 pasos se ejecutan en el orden exacto y que el script se detiene al primer fallo si lo hubiera.
      Archivos: ninguno (verificación).
      Verificar: salida muestra Auditoría → ESLint → Tipado → Formato → Tests → Build. Registrar en el resumen: nombre de la config de producción usada (`production`), comando single-run (`ng test --watch=false`), camino de ESLint tomado (`ng add angular-eslint`), y número de hallazgos de ESLint sobre el código existente. Si ESLint reporta errores en código existente, NO modificar la app: reportar el conteo y dejar la infraestructura lista.

---

## Ediciones exactas de package.json

Bloque `scripts` resultante (reemplaza el actual):

```json
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "build": "ng build",
  "build:check": "ng build --configuration production",
  "watch": "ng build --watch --configuration development",
  "test": "ng test",
  "test:ci": "ng test --watch=false",
  "format": "prettier --write \"src/**/*.{ts,html,css,json}\"",
  "format:check": "prettier --check \"src/**/*.{ts,html,css,json}\"",
  "typecheck": "tsc --noEmit -p tsconfig.app.json",
  "audit": "npm audit --audit-level=high",
  "lint:eslint": "ng lint",
  "lint": "npm run lint:eslint && npm run typecheck && npm run format:check"
}
```

Notas:
- `ng add angular-eslint` puede dejar también un target `lint` en `angular.json`; el script npm `lint:eslint` lo invoca con `ng lint`. No borrar el target de `angular.json`.
- Las `devDependencies` de eslint/angular-eslint/typescript-eslint las agrega el schematic; no editarlas a mano salvo en el fallback manual (paso 2).

## Contenido propuesto de eslint.config.js (flat config)

Este es el contenido esperado del generado por el schematic v22; si difiere ligeramente en orden, respetar lo generado mientras cubra `.ts` y `.html` de `src/` con configs recomendadas. Úsese tal cual SOLO en el fallback manual (paso 2):

```js
// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
```

Nota: el flat config generado puede usar `tseslint.config(...)`; mantener las configs `recommended` (no `strict`/`strictTypeChecked`) para no forzar refactors en la app, según la restricción de la tarea.

## Contenido exacto de validar.sh

```bash
#!/usr/bin/env bash
#
# 🧪  validar.sh
# Revisa calidad y seguridad del código antes de subir cambios.
# Orden: Auditoría → ESLint → Tipado → Formato → Tests → Build.
# Uso (desde la carpeta frontend): ./scripts/validar.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

error_handler() {
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "❌  La validación encontró errores. Revisa el detalle arriba."
  echo "💡  ¿Formato con errores? Corrígelo automáticamente con: npm run format"
  echo ""
}
trap error_handler ERR

echo ""
echo "🧪  Validando el código de Dominotes Frontend..."
echo "────────────────────────────────────────────────────────"

echo ""
echo "🔒  Auditando dependencias (npm audit)..."
npm run audit
echo "✅  Sin vulnerabilidades altas/críticas."

echo ""
echo "🧹  Revisando ESLint (Angular)..."
npm run lint:eslint
echo "✅  ESLint sin errores."

echo ""
echo "🔤  Revisando tipado (TypeScript)..."
npm run typecheck
echo "✅  Tipado correcto."

echo ""
echo "🎨  Revisando formato (Prettier)..."
npm run format:check
echo "✅  Formato correcto."

echo ""
echo "🧪  Ejecutando pruebas unitarias (Vitest)..."
npm run test:ci
echo "✅  Pruebas en verde."

echo ""
echo "🏗️   Compilando build de verificación (producción)..."
npm run build:check
echo "✅  Build de producción correcto."

echo ""
echo "────────────────────────────────────────────────────────"
echo "🎉  ¡Todo en orden! El código pasó las validaciones."
echo ""
echo "💡  ¿Formato con errores? Corrígelo automáticamente con: npm run format"
echo ""
```

## Contenido exacto de validar.bat

```bat
@echo off
REM ========================================================
REM  validar.bat  -  Calidad y seguridad del codigo.
REM  Orden: Auditoria -> ESLint -> Tipado -> Formato -> Tests -> Build.
REM  Uso (desde la carpeta frontend): scripts\validar.bat
REM ========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [TEST] Validando el codigo de Dominotes Frontend...
echo --------------------------------------------------------

echo.
echo [AUDIT] Auditando dependencias (npm audit)...
call npm run audit
if errorlevel 1 goto :error
echo [OK]   Sin vulnerabilidades altas/criticas.

echo.
echo [LINT] Revisando ESLint (Angular)...
call npm run lint:eslint
if errorlevel 1 goto :error
echo [OK]   ESLint sin errores.

echo.
echo [TYPE] Revisando tipado (TypeScript)...
call npm run typecheck
if errorlevel 1 goto :error
echo [OK]   Tipado correcto.

echo.
echo [FMT]  Revisando formato (Prettier)...
call npm run format:check
if errorlevel 1 goto :error
echo [OK]   Formato correcto.

echo.
echo [TEST] Ejecutando pruebas unitarias (Vitest)...
call npm run test:ci
if errorlevel 1 goto :error
echo [OK]   Pruebas en verde.

echo.
echo [BUILD] Compilando build de verificacion (produccion)...
call npm run build:check
if errorlevel 1 goto :error
echo [OK]   Build de produccion correcto.

echo.
echo --------------------------------------------------------
echo [DONE] Todo en orden! El codigo paso las validaciones.
echo.
echo [TIP]  Formato con errores? Corrigelo con: npm run format
echo.
goto :eof

:error
echo.
echo [FAIL] La validacion encontro errores. Revisa el detalle arriba.
echo [TIP]  Para corregir el formato automaticamente: npm run format
exit /b 1
```

## Riesgos y supuestos

- **Supuesto**: `ng add angular-eslint` funciona no interactivo con `--skip-confirmation`; si pidiera confirmaciones adicionales, el implementador puede usar `echo y | npx ng add angular-eslint` o el flag documentado. Fallback manual en paso 2.
- **Riesgo**: ESLint puede reportar hallazgos en el código existente (p. ej. selectores, reglas de template accessibility). Según la tarea, NO refactorizar la app: usar reglas recomendadas y reportar el conteo. Si un hallazgo rompe `validar.sh` (ESLint devuelve exit!=0 por errores), evaluar bajar esa regla a `warn` dentro de `eslint.config.js` para no bloquear el pipeline, documentándolo; no tocar la app.
- **Riesgo `npm audit`**: si hay vulnerabilidades high/critical sin fix disponible, `npm run audit` fallará y detendrá `validar.sh`. Es el comportamiento deseado (seguridad), pero debe reportarse al usuario qué vulnerabilidades aparecen.
- **Build en TTY**: `ng test --watch=false` garantiza corrida única incluso en terminal interactiva.
```
