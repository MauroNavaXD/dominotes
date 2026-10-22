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
