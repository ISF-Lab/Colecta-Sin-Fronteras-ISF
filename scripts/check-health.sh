#!/bin/bash

# Script para verificar el estado de salud de Colecta ISF
# Ejecuta checks básicos contra Worker, Frontend y Supabase
#
# Uso: ./check-health.sh [environment]
#   environment: local | production (default: production)

set +e  # No salir en primer error

# Configuración de URLs según entorno
ENV="${1:-production}"

if [ "$ENV" = "local" ]; then
    WORKER_URL="http://localhost:8787"
    FRONTEND_URL="http://localhost:4321"
    echo "🧪 Modo: DESARROLLO LOCAL"
else
    WORKER_URL="https://api.colecta.isf.cl"
    FRONTEND_URL="https://colecta.isf.cl"
    echo "🌐 Modo: PRODUCCIÓN"
fi

echo "🏥 Health Check - Colecta ISF"
echo "============================="
echo ""

# Contador de errores
ERRORS=0

# Función para hacer checks
check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    local description=$4
    
    echo "🔍 Verificando: $name"
    echo "   URL: $url"
    
    # Hacer request y capturar código de estado
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo "   ✅ OK (HTTP $HTTP_CODE)"
    else
        echo "   ❌ ERROR (HTTP $HTTP_CODE, esperado $expected_code)"
        echo "   Descripción: $description"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
}

# 1. Check Worker API
echo "1️⃣  Worker API"
check_endpoint \
    "Endpoint /api/donar" \
    "$WORKER_URL/api/donar" \
    "405" \
    "Debe responder 405 Method Not Allowed (GET no permitido)"

# 2. Check Frontend
echo "2️⃣  Frontend"
check_endpoint \
    "Landing page" \
    "$FRONTEND_URL/" \
    "200" \
    "Debe cargar la página principal"

# 3. Check Supabase (si está en producción)
if [ "$ENV" = "production" ]; then
    echo "3️⃣  Supabase Database"
    
    # Verificar que SUPABASE_URL existe
    if [ -z "$SUPABASE_URL" ]; then
        echo "   ⚠️  SUPABASE_URL no está configurada"
        echo "   💡 Exporta: export SUPABASE_URL=https://xyz.supabase.co"
        echo ""
    else
        # Verificar que SUPABASE_ANON_KEY existe
        if [ -z "$SUPABASE_ANON_KEY" ]; then
            echo "   ⚠️  SUPABASE_ANON_KEY no está configurada"
            echo "   💡 Exporta: export SUPABASE_ANON_KEY=your_anon_key"
            echo ""
        else
            echo "🔍 Verificando: Public Stats View"
            echo "   URL: $SUPABASE_URL/rest/v1/public_stats"
            
            RESPONSE=$(curl -s -w "\n%{http_code}" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                "$SUPABASE_URL/rest/v1/public_stats?select=*")
            
            HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
            BODY=$(echo "$RESPONSE" | head -n-1)
            
            if [ "$HTTP_CODE" = "200" ]; then
                echo "   ✅ OK (HTTP $HTTP_CODE)"
                echo "   Datos: $BODY"
            else
                echo "   ❌ ERROR (HTTP $HTTP_CODE)"
                echo "   Response: $BODY"
                ERRORS=$((ERRORS + 1))
            fi
            echo ""
        fi
    fi
fi

# Resumen final
echo "============================="
echo "📊 Resumen del Health Check"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ Todos los checks pasaron exitosamente"
    echo ""
    exit 0
else
    echo "❌ $ERRORS check(s) fallaron"
    echo ""
    echo "💡 Próximos pasos:"
    echo "   1. Revisa los logs del Worker: wrangler tail"
    echo "   2. Verifica las variables de entorno"
    echo "   3. Consulta docs/TROUBLESHOOTING.md"
    echo ""
    exit 1
fi

# EJEMPLOS DE USO:
#
# 1. Check de producción:
#    bash check-health.sh
#
# 2. Check local (durante desarrollo):
#    bash check-health.sh local
#
# 3. Check con variables de Supabase:
#    export SUPABASE_URL=https://xyz.supabase.co
#    export SUPABASE_ANON_KEY=your_anon_key
#    bash check-health.sh
#
# 4. Integración con CI/CD:
#    if bash check-health.sh; then
#        echo "Deploy exitoso"
#    else
#        echo "Rollback necesario"
#        exit 1
#    fi