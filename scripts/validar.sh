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
