#!/bin/bash

# Script para simular un webhook de Payku
# Útil para testing local y validación de la lógica de procesamiento
#
# Uso:
#   ./test-webhook.sh                    # Testing local (localhost:8787)
#   ./test-webhook.sh https://api.url    # Testing en producción
#
# NOTA: En producción, el verification_key debe ser válido

set -e

# URL del webhook (default: local)
WEBHOOK_URL="${1:-http://localhost:8787/api/webhook/payku}"

echo "🧪 Simulador de Webhook de Payku"
echo "================================="
echo ""
echo "📡 Endpoint: $WEBHOOK_URL"
echo ""

# Generar un order_id único para testing
TIMESTAMP=$(date +%s)
ORDER_ID="ISF-TEST-${TIMESTAMP}"

# Payload de ejemplo (simula webhook de Payku exitoso)
PAYLOAD=$(cat <<EOF
{
  "order": "$ORDER_ID",
  "status": "success",
  "transaction_id": "9916587765599311",
  "verification_key": "dummy_key_for_testing",
  "payment_key": "abc123",
  "amount": 10000,
  "currency": "CLP",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

echo "📦 Payload:"
echo "$PAYLOAD" | jq '.'
echo ""

echo "🚀 Enviando webhook..."
echo ""

# Enviar el webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Extraer código de estado y body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "📨 Respuesta:"
echo "   Status Code: $HTTP_CODE"
echo "   Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Evaluar resultado
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Webhook procesado exitosamente"
    exit 0
else
    echo "❌ Error al procesar webhook"
    exit 1
fi

# EJEMPLOS DE USO:
#
# 1. Testing local:
#    bash test-webhook.sh
#
# 2. Testing en producción:
#    bash test-webhook.sh https://api.colecta.isf.cl
#
# 3. Simular webhook fallido (editar PAYLOAD):
#    Cambiar "status": "failed" en lugar de "success"
#
# 4. Testing de idempotencia:
#    Ejecutar el mismo script 2 veces con el mismo ORDER_ID
#    (ambas deben devolver 200)
#
# NOTA IMPORTANTE:
# Para testing en producción, necesitas un verification_key válido
# que se genera con la private key de Payku. Este script usa
# un valor dummy que solo funcionará si deshabilitas temporalmente
# la validación en desarrollo.