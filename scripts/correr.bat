@echo off
REM ========================================================
REM  correr.bat  -  Levanta el servidor de desarrollo.
REM  Uso (desde la carpeta frontend): scripts\correr.bat
REM ========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [RUN]  Levantando el frontend de Dominotes...
echo [WEB]  Abre tu navegador en: http://localhost:4200/
echo [STOP] Presiona Ctrl + C para detener el servidor.
echo --------------------------------------------------------
echo.

call npm start
