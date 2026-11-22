#!/bin/sh
# ==================================================================
#  EISENKU OS 10.0 NEXT GENERATION · servidor local (deja esta terminal abierta)
#  Uso: sh INICIAR.sh   (o ./INICIAR.sh tras chmod +x INICIAR.sh)
#  Opciones: descomenta las líneas que quieras activar.
# ==================================================================
cd "$(dirname "$0")" || exit 1

# --- Puerto (el proxy usa además el siguiente: 8081) ---
# export PORT=8080
# --- Abrirlo desde otros dispositivos de tu red (Xbox, tableta…). Solo en redes de confianza ---
# export HOST=0.0.0.0
# --- IA opcional para el Maestro Domingo (la clave nunca se envía al navegador) ---
# export AI_API_KEY=tu_clave
# export AI_BASE_URL=https://api.groq.com/openai/v1
# export AI_MODEL=llama-3.3-70b-versatile
# export AI_ACCESS_CODE=codigo_para_tus_usuarios
# export AI_RATE_PER_MIN=20
# export AI_DAILY_LIMIT=500

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  No se encontró Node.js. Instálalo desde https://nodejs.org (versión 18 o superior)."
  echo
  exit 1
fi
NODEMAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODEMAJOR" -lt 18 ]; then
  echo
  echo "  Tu Node.js es antiguo (versión $NODEMAJOR). EISENKU necesita Node.js 18 o superior: https://nodejs.org"
  echo
  exit 1
fi

URL="http://127.0.0.1:${PORT:-8080}"
(sleep 1; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1) &
exec node server.mjs
