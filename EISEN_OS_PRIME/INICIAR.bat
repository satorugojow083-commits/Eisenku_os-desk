@echo off
chcp 65001 >nul
title EISENKU OS 10.0 NEXT GENERATION
cd /d "%~dp0"

rem ==================================================================
rem  EISENKU OS 10.0 NEXT GENERATION - servidor local (deja esta ventana abierta)
rem  Opciones: quita "rem" de la linea que quieras activar.
rem ==================================================================
rem --- Puerto (el proxy usa ademas el siguiente: 8081) ---
rem set PORT=8080
rem --- Abrirlo desde otros dispositivos de tu red (Xbox, tableta...). Solo en redes de confianza ---
rem set HOST=0.0.0.0
rem --- IA opcional para el Maestro Domingo (la clave nunca se envia al navegador) ---
rem set AI_API_KEY=tu_clave
rem set AI_BASE_URL=https://api.groq.com/openai/v1
rem set AI_MODEL=llama-3.3-70b-versatile
rem set AI_ACCESS_CODE=codigo_para_tus_usuarios
rem set AI_RATE_PER_MIN=20
rem set AI_DAILY_LIMIT=500

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encontro Node.js. Instalalo desde https://nodejs.org ^(version 18 o superior^)
  echo   y vuelve a abrir INICIAR.bat.
  echo.
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 18 (
  echo.
  echo   Tu Node.js es antiguo ^(version %NODEMAJOR%^). EISENKU necesita Node.js 18 o superior: https://nodejs.org
  echo.
  pause
  exit /b 1
)

if "%PORT%"=="" set PORT=8080
start "" http://127.0.0.1:%PORT%
node server.mjs
pause
