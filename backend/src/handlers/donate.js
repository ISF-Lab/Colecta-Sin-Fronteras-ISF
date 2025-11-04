/**
 * HANDLER: POST /api/donar
 * Crea una donación pendiente y retorna URL de pago de Payku
 */

import { validateDonationData, validateTurnstile } from '../lib/validators.js';
import { createPendingDonation, getTeamBySlug } from '../lib/supabase.js';
import { createPaykuTransaction } from '../lib/payku.js';
import { jsonResponse, jsonError, corsHeaders } from '../utils/response.js';

/**
 * Genera un order_id único: ISF-{timestamp}-{random6}
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ISF-${timestamp}-${random}`;
}

/**
 * Handler principal
 */
export async function handleDonate(request, env) {
  try {
    // ========================================================================
    // 1. PARSEAR BODY
    // ========================================================================
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[DONATE] Error parseando JSON:', error);
      return jsonError('INVALID_JSON', 'JSON inválido', 400);
    }

    console.log('[DONATE] Iniciando donación:', {
      nombre: body.nombre,
      monto: body.monto,
      team_slug: body.team_slug || 'general'
    });

    // ========================================================================
    // 2. VALIDAR TURNSTILE (fail fast)
    // ========================================================================
    const turnstileToken = body['cf-turnstile-response'];
if (!turnstileToken) {
  return jsonError('TURNSTILE_REQUIRED', 'Token de Turnstile requerido', 400);
}

// --- INICIO: Bypass para desarrollo local ---
// IMPORTANTE: Este bypass SOLO funciona en desarrollo local
// En producción, env.ENVIRONMENT será 'production' y esto nunca se ejecutará
const isDevelopment = env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'local';
const isDevelopmentBypass = isDevelopment && turnstileToken === 'test-token';

if (isDevelopmentBypass) {
  console.log('[DONATE] ⚠️ Usando bypass de Turnstile (solo desarrollo)');
} else {
  // Validación real de Turnstile
  const turnstileValid = await validateTurnstile(turnstileToken, env.TURNSTILE_SECRET);
  if (!turnstileValid) {
    console.warn('[DONATE] Turnstile inválido');
    return jsonError('TURNSTILE_INVALID', 'Verificación anti-bot fallida', 400);
  }
  console.log('[DONATE] ✅ Turnstile válido');
}

    // ========================================================================
    // 3. VALIDAR DATOS (fail fast)
    // ========================================================================
    const errors = validateDonationData(body);
    if (errors.length > 0) {
      console.warn('[DONATE] Validación fallida:', errors);
      return jsonError('VALIDATION_ERROR', errors[0], 400);
    }

    // ========================================================================
    // 4. GENERAR ORDER_ID ÚNICO
    // ========================================================================
    const orderId = generateOrderId();
    console.log('[DONATE] Order ID generado:', orderId);

    // ========================================================================
    // 5. BUSCAR EQUIPO (o usar 'general')
    // ========================================================================
    const teamSlug = body.team_slug || 'general';
    const team = await getTeamBySlug(teamSlug, env);
    
    if (!team) {
      console.error('[DONATE] Equipo no encontrado:', teamSlug);
      return jsonError('TEAM_NOT_FOUND', 'Equipo no encontrado', 400);
    }

    console.log('[DONATE] Equipo encontrado:', team.name);

    // ========================================================================
    // 6. CREAR REGISTRO PENDIENTE EN SUPABASE
    // ========================================================================
    const donationData = {
      nombre: body.nombre,
      email: body.email,
      monto: body.monto,
      mensaje: body.mensaje || null,
      order_id: orderId,
      team_id: team.id,
      estado: 'pendiente',
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('cf-connecting-ip')
    };

    const donation = await createPendingDonation(donationData, env);
    if (!donation) {
      console.error('[DONATE] Error creando donación en Supabase');
      return jsonError('DATABASE_ERROR', 'Error guardando donación', 500);
    }

    console.log('[DONATE] Donación creada en DB:', donation.id);

    // ========================================================================
    // 7. CREAR TRANSACCIÓN EN PAYKU
    // ========================================================================
    const paykuData = {
      email: body.email,
      order: orderId,
      subject: `Donación ISF - ${team.name}`,
      amount: body.monto,
      payment_method: 'all', // Permitir todos los métodos de pago
      urlreturn: `${env.FRONTEND_URL}/gracias?order=${orderId}`,
      urlnotify: `${env.WORKER_URL}/api/webhook/payku`
    };

    const paykuResponse = await createPaykuTransaction(paykuData, env);
    
    if (!paykuResponse || !paykuResponse.url) {
      console.error('[DONATE] Error creando transacción en Payku:', paykuResponse);
      return jsonError('PAYKU_ERROR', 'Error procesando pago', 500);
    }

    console.log('[DONATE] Transacción Payku creada:', {
      id: paykuResponse.id,
      url: paykuResponse.url
    });

    // ========================================================================
    // 8. RETORNAR URL DE PAGO
    // ========================================================================
    return jsonResponse({
      ok: true,
      url: paykuResponse.url,
      order: orderId
    }, 200);

  } catch (error) {
    console.error('[DONATE] Error inesperado:', error);
    return jsonError('SERVER_ERROR', 'Error interno del servidor', 500);
  }
}