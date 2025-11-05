#!/bin/bash

# Script para configurar secrets en Cloudflare Workers
# Uso: ./setup-secrets.sh [production]

set -e

echo "🔐 Configuración de Secrets para Colecta ISF Worker"
echo "=================================================="
echo ""

# Detectar entorno
ENV=""
if [ "$1" = "production" ]; then
    ENV="--env production"
    echo "📦 Entorno: PRODUCTION"
else
    echo "📦 Entorno: DEVELOPMENT"
fi
echo ""

# Intentar cargar variables de archivos existentes
if [ -f "../.env" ]; then
    echo "📄 Cargando variables desde ../.env"
    source ../.env
elif [ -f ".dev.vars" ]; then
    echo "📄 Cargando variables desde .dev.vars"
    source .dev.vars
else
    echo "⚠️  No se encontró .env ni .dev.vars, se solicitarán manualmente"
fi
echo ""

# Lista de secrets necesarios
declare -A SECRETS=(
    ["SUPABASE_URL"]="URL de tu proyecto Supabase (ej: https://xyz.supabase.co)"
    ["SUPABASE_SERVICE_KEY"]="Service Role Key (secret) desde Supabase Dashboard"
    ["PAYKU_PUBLIC_KEY"]="Public Key desde Dashboard de Payku"
    ["PAYKU_PRIVATE_KEY"]="Private Key desde Dashboard de Payku"
    ["TURNSTILE_SECRET"]="Secret Key desde Cloudflare Turnstile"
)

# Función para solicitar y configurar un secret
configure_secret() {
    local name=$1
    local description=$2
    
    echo "🔑 Configurando: $name"
    echo "   Descripción: $description"
    
    # Verificar si ya existe la variable de entorno
    local current_value="${!name}"
    
    if [ -n "$current_value" ]; then
        echo "   ✓ Valor encontrado en variables de entorno"
        read -p "   ¿Usar este valor? (s/n): " use_existing
        if [ "$use_existing" = "s" ] || [ "$use_existing" = "S" ]; then
            echo "$current_value" | wrangler secret put $name $ENV
            echo "   ✅ Secret configurado"
            echo ""
            return
        fi
    fi
    
    # Solicitar valor manualmente
    read -p "   Ingresa $name: " secret_value
    
    if [ -z "$secret_value" ]; then
        echo "   ⚠️  Valor vacío, saltando..."
        echo ""
        return
    fi
    
    # Configurar el secret
    echo "$secret_value" | wrangler secret put $name $ENV
    echo "   ✅ Secret configurado"
    echo ""
}

# Configurar cada secret
echo "📋 Configurando secrets..."
echo ""

for secret_name in "${!SECRETS[@]}"; do
    configure_secret "$secret_name" "${SECRETS[$secret_name]}"
done

# Listar todos los secrets configurados
echo "=================================================="
echo "📊 Resumen de secrets configurados:"
echo ""
wrangler secret list $ENV

echo ""
echo "✅ Configuración completada!"
echo ""
echo "💡 Próximos pasos:"
echo "   1. Verificar que todos los secrets están listados arriba"
echo "   2. Ejecutar: wrangler deploy $ENV"
echo "   3. Probar el Worker con: bash ../scripts/check-health.sh"
echo ""