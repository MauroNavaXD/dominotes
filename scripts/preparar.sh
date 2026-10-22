#!/usr/bin/env bash
#
# 🛠️  preparar.sh
# Prepara el entorno local para quien acaba de clonar el repositorio.
# Uso (desde la carpeta frontend): ./scripts/preparar.sh
#
set -e

# Movernos a la raíz del proyecto (carpeta padre de /scripts)
cd "$(dirname "$0")/.."

echo ""
echo "🚀  Preparando el entorno local de Dominotes Frontend..."
echo "────────────────────────────────────────────────────────"

# 1. Verificar Node.js
echo ""
echo "🔎  Verificando Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "❌  No se encontró Node.js. Instálalo desde https://nodejs.org/ y vuelve a intentarlo."
  exit 1
fi
echo "✅  Node.js detectado: $(node --version)"

# 2. Verificar npm
echo ""
echo "🔎  Verificando npm..."
if ! command -v npm >/dev/null 2>&1; then
  echo "❌  No se encontró npm. Normalmente viene con Node.js: https://nodejs.org/"
  exit 1
fi
echo "✅  npm detectado: $(npm --version)"

# 3. Instalar dependencias
echo ""
echo "📦  Instalando dependencias (npm ci si hay package-lock, si no npm install)..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
echo "✅  Dependencias instaladas correctamente."

echo ""
echo "────────────────────────────────────────────────────────"
echo "🎉  ¡Entorno listo!"
echo ""
echo "👉  Para levantar el frontend:   ./scripts/correr.sh"
echo "👉  Para validar el código:      ./scripts/validar.sh"
echo ""
