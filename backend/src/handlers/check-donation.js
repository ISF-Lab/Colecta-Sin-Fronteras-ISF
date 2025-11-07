/**
 * HANDLER: GET /api/donacion/:orderId
 * Consulta el estado de una donación por order_id
 * 
 * Este endpoint es público y permite verificar si una donación fue pagada
 * antes de mostrar la página de agradecimiento
 */

import { getDonationByOrder } from '../lib/supabase.js';
import { jsonResponse, jsonError, corsHeaders } from '../utils/response.js';

/**
 * Handler principal
 */
export async function handleCheckDonation(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Extraer orderId de la URL: /api/donacion/:orderId
    const orderIdIndex = pathParts.indexOf('donacion');
    if (orderIdIndex === -1 || orderIdIndex >= pathParts.length - 1) {
      return jsonError('INVALID_REQUEST', 'Order ID requerido', 400, env.FRONTEND_URL);
    }
    
    const orderId = pathParts[orderIdIndex + 1];
    
    if (!orderId) {
      return jsonError('INVALID_REQUEST', 'Order ID requerido', 400, env.FRONTEND_URL);
    }

    console.log('[CHECK_DONATION] Consultando estado de donación:', orderId);

    // ========================================================================
    // BUSCAR DONACIÓN EN DATABASE
    // ========================================================================
    const donation = await getDonationByOrder(orderId, env);
    
    if (!donation) {
      console.warn('[CHECK_DONATION] Donación no encontrada:', orderId);
      return jsonError('NOT_FOUND', 'Donación no encontrada', 404, env.FRONTEND_URL);
    }

    // ========================================================================
    // RETORNAR ESTADO
    // ========================================================================
    return jsonResponse({
      ok: true,
      order_id: donation.order_id,
      estado: donation.estado,
      pagado: donation.estado === 'pagado'
    }, 200, env.FRONTEND_URL);

  } catch (error) {
    console.error('[CHECK_DONATION] Error inesperado:', error);
    return jsonError('SERVER_ERROR', 'Error interno del servidor', 500, env.FRONTEND_URL);
  }
}

