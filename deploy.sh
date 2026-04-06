#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
#  deploy.sh — Deploy manual a Firebase Hosting
#  Uso: ./deploy.sh [usuario|conductor|base|all|functions]
# ══════════════════════════════════════════════════════
set -e

TARGET="${1:-all}"
PROJECT="sitios-hidalgo-gps"

echo "🚀 Deploy SHidalgo Kue'in → target: $TARGET"
echo "   Proyecto Firebase: $PROJECT"
echo ""

case "$TARGET" in
  usuario)
    echo "📱 Desplegando App Usuario..."
    firebase deploy --only hosting:usuario --project "$PROJECT"
    ;;
  conductor)
    echo "🚖 Desplegando App Conductor..."
    firebase deploy --only hosting:conductor --project "$PROJECT"
    ;;
  base)
    echo "🖥️  Desplegando Panel Base..."
    firebase deploy --only hosting:base --project "$PROJECT"
    ;;
  functions)
    echo "⚡ Desplegando Cloud Functions..."
    firebase deploy --only functions --project "$PROJECT"
    ;;
  rules)
    echo "🔒 Desplegando Reglas de Base de Datos..."
    firebase deploy --only database --project "$PROJECT"
    ;;
  all)
    echo "🌐 Desplegando todo..."
    firebase deploy --project "$PROJECT"
    ;;
  *)
    echo "❌ Target no reconocido: $TARGET"
    echo ""
    echo "Uso: ./deploy.sh [usuario|conductor|base|functions|rules|all]"
    exit 1
    ;;
esac

echo ""
echo "✅ Deploy completado."
echo "   usuario:   https://sitios-hidalgo-gps.web.app"
echo "   conductor: https://sitios-hidalgo-conductor.web.app"
echo "   base:      https://sitios-hidalgo-base.web.app"
