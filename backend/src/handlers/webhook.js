/**
 * HANDLER: POST /api/webhook/payku
 * Procesa webhooks de confirmación de pago de Payku
 * 
 * CRÍTICO: Siempre retornar 200 para evitar reintentos infinitos
 */

import { getDonationByOrder, updateDonationStatus, logWebhookEvent } from '../lib/supabase.js';
import { validatePaykuSignature } from '../lib/payku.js';

/**
 * Handler principal del webhook
 */
export async function handleWebhook(request, env) {
  let body;
  
  try {
    // ========================================================================
    // 1. PARSEAR BODY
    // ========================================================================
    try {
      body = await request.json();
    } catch (error) {
      console.error('[WEBHOOK] Error parseando JSON:', error);
      // Log el error pero retornar 200
      await logWebhookEvent({
        order_id: 'UNKNOWN',
        payload: { error: 'Invalid JSON' },
        status_code: 200
      }, env);
      return new Response(JSON.stringify({ received: true, error: 'invalid_json' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[WEBHOOK] Recibido de Payku:', {
      order: body.order,
      status: body.status,
      transaction_id: body.transaction_id
    });

    // ========================================================================
    // 2. LOGUEAR SIEMPRE (ANTES de validar)
    // ========================================================================
    await logWebhookEvent({
      order_id: body.order || 'UNKNOWN',
      payload: body,
      status_code: 200
    }, env);

    // ========================================================================
    // 3. VALIDAR DATOS BÁSICOS
    // ========================================================================
    if (!body.order || !body.status || !body.verification_key) {
      console.error('[WEBHOOK] Datos incompletos:', body);
      return new Response(JSON.stringify({ received: true, error: 'incomplete_data' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ========================================================================
    // 4. VALIDAR FIRMA DE PAYKU (CRÍTICO para seguridad)
    // ========================================================================
    const isValid = validatePaykuSignature(
      body.verification_key,
      body.order,
      env.PAYKU_PRIVATE_KEY
    );

    if (!isValid) {
      console.error('[WEBHOOK] Firma inválida - posible intento de fraude');
      return new Response(JSON.stringify({ received: true, error: 'invalid_signature' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[WEBHOOK] Firma verificada ✓');

    // ========================================================================
    // 5. BUSCAR DONACIÓN POR ORDER_ID
    // ========================================================================
    const donation = await getDonationByOrder(body.order, env);
    
    if (!donation) {
      console.error('[WEBHOOK] Donación no encontrada:', body.order);
      return new Response(JSON.stringify({ received: true, error: 'donation_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[WEBHOOK] Donación encontrada:', {
      id: donation.id,
      estado_actual: donation.estado,
      monto: donation.monto
    });

    // ========================================================================
    // 6. IDEMPOTENCIA: Si ya está en estado final, no hacer nada
    // ========================================================================
    if (donation.estado === 'pagado' || donation.estado === 'fallido') {
      console.log('[WEBHOOK] Donación ya procesada (idempotencia):', donation.estado);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ========================================================================
    // 7. ACTUALIZAR ESTADO SEGÚN STATUS DE PAYKU
    // ========================================================================
    let nuevoEstado;
    let updateData = {
      order_id: body.order,
      payku_transaction_id: body.transaction_id,
      payku_status: body.status
    };

    // Mapear status de Payku a nuestros estados
    if (body.status === 'success' || body.status === 'paid') {
      nuevoEstado = 'pagado';
      updateData.estado = 'pagado';
      updateData.paid_at = new Date().toISOString();
      console.log('[WEBHOOK] Marcando como PAGADO');
    } else if (body.status === 'failed' || body.status === 'rejected' || body.status === 'cancelled') {
      nuevoEstado = 'fallido';
      updateData.estado = 'fallido';
      console.log('[WEBHOOK] Marcando como FALLIDO');
    } else {
      // Status desconocido, loguear pero no actualizar
      console.warn('[WEBHOOK] Status desconocido de Payku:', body.status);
      return new Response(JSON.stringify({ received: true, unknown_status: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ========================================================================
    // 8. GUARDAR EN DATABASE
    // ========================================================================
    const updated = await updateDonationStatus(updateData, env);
    
    if (!updated) {
      console.error('[WEBHOOK] Error actualizando donación en DB');
      // Aún así retornar 200 para evitar reintentos
      return new Response(JSON.stringify({ received: true, error: 'database_error' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[WEBHOOK] Donación actualizada exitosamente:', {
      order: body.order,
      nuevo_estado: nuevoEstado
    });

    // ========================================================================
    // 9. RETORNAR 200 SIEMPRE
    // ========================================================================
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[WEBHOOK] Error inesperado:', error);
    
    // Log del error
    try {
      await logWebhookEvent({
        order_id: body?.order || 'ERROR',
        payload: { error: error.message, stack: error.stack },
        status_code: 200
      }, env);
    } catch (logError) {
      console.error('[WEBHOOK] Error logueando error:', logError);
    }

    // CRÍTICO: Retornar 200 incluso en errores para evitar reintentos infinitos
    return new Response(JSON.stringify({ received: true, error: 'internal_error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}