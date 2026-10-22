@echo off
REM ========================================================
REM  validar.bat  -  Revisa el lint (tipado) y el formato.
REM  Uso (desde la carpeta frontend): scripts\validar.bat
REM ========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [TEST] Validando el codigo de Dominotes Frontend...
echo --------------------------------------------------------

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
