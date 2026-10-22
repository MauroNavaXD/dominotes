#!/usr/bin/env bash
#
# 🧪  validar.sh
# Revisa el lint (tipado) y el formato del código.
# Uso (desde la carpeta frontend): ./scripts/validar.sh
#
set -e

cd "$(dirname "$0")/.."

echo ""
echo "🧪  Validando el código de Dominotes Frontend..."
echo "────────────────────────────────────────────────────────"

echo ""
echo "🔤  Revisando tipado (TypeScript)..."
npm run typecheck
echo "✅  Tipado correcto."

echo ""
echo "🎨  Revisando formato (Prettier)..."
npm run format:check
echo "✅  Formato correcto."

echo ""
echo "────────────────────────────────────────────────────────"
echo "🎉  ¡Todo en orden! El código pasó las validaciones."
echo ""
echo "💡  ¿Formato con errores? Corrígelo automáticamente con: npm run format"
echo ""
