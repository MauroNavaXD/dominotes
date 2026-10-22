@echo off
REM ========================================================
REM  preparar.bat  -  Prepara el entorno local tras clonar.
REM  Uso (desde la carpeta frontend): scripts\preparar.bat
REM ========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [SETUP] Preparando el entorno local de Dominotes Frontend...
echo --------------------------------------------------------

REM 1. Verificar Node.js
echo.
echo [CHECK] Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js. Instalalo desde https://nodejs.org/ y vuelve a intentarlo.
  exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo [OK]    Node.js detectado: %%v

REM 2. Verificar npm
echo.
echo [CHECK] Verificando npm...
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro npm. Normalmente viene con Node.js: https://nodejs.org/
  exit /b 1
)
for /f "delims=" %%v in ('npm --version') do echo [OK]    npm detectado: %%v

REM 3. Instalar dependencias
echo.
echo [DEPS]  Instalando dependencias...
if exist "package-lock.json" (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 (
  echo [ERROR] Fallo la instalacion de dependencias.
  exit /b 1
)
echo [OK]    Dependencias instaladas correctamente.

echo.
echo --------------------------------------------------------
echo [DONE] Entorno listo!
echo.
echo   Para levantar el frontend:   scripts\correr.bat
echo   Para validar el codigo:      scripts\validar.bat
echo.
