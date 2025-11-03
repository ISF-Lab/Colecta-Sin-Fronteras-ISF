/**
 * COLECTA ISF - CLOUDFLARE WORKER
 * Router principal con 2 endpoints
 */

import { handleDonate } from './handlers/donate.js';
import { handleWebhook } from './handlers/webhook.js';
import { corsHeaders, jsonError } from './utils/response.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);

    // ========================================================================
    // CORS Preflight (OPTIONS)
    // ========================================================================
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env.FRONTEND_URL)
      });
    }

    // ========================================================================
    // RUTAS DE LA API
    // ========================================================================

    // POST /api/donar - Crear donación y obtener URL de pago
    if (url.pathname === '/api/donar' && request.method === 'POST') {
      try {
        return await handleDonate(request, env);
      } catch (error) {
        console.error('[ERROR] /api/donar:', error);
        return jsonError('SERVER_ERROR', 'Error interno del servidor', 500);
      }
    }

    // POST /api/webhook/payku - Webhook de confirmación de Payku
    if (url.pathname === '/api/webhook/payku' && request.method === 'POST') {
      try {
        return await handleWebhook(request, env);
      } catch (error) {
        console.error('[ERROR] /api/webhook/payku:', error);
        // CRÍTICO: Siempre retornar 200 en webhooks para evitar reintentos infinitos
        return new Response(JSON.stringify({ received: true, error: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================================================
    // 404 - Ruta no encontrada
    // ========================================================================
    return jsonError('NOT_FOUND', 'Ruta no encontrada', 404);
  }
};