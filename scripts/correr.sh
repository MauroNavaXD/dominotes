#!/usr/bin/env bash
#
# ▶️  correr.sh
# Levanta el servidor de desarrollo del frontend.
# Uso (desde la carpeta frontend): ./scripts/correr.sh
#
set -e

cd "$(dirname "$0")/.."

echo ""
echo "▶️   Levantando el frontend de Dominotes..."
echo "🌐  Abre tu navegador en: http://localhost:4200/"
echo "🛑  Presiona Ctrl + C para detener el servidor."
echo "────────────────────────────────────────────────────────"
echo ""

npm start
