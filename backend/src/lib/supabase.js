/**
 * CLIENTE SUPABASE
 * Interacción directa con la REST API de Supabase
 */

/**
 * Headers comunes para todas las requests a Supabase
 */
function getSupabaseHeaders(env) {
  return {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

/**
 * Crea una donación pendiente en la base de datos
 */
export async function createPendingDonation(data, env) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/donations`, {
      method: 'POST',
      headers: getSupabaseHeaders(env),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SUPABASE] Error creando donación:', error);
      return null;
    }

    const donations = await response.json();
    return donations[0];
  } catch (error) {
    console.error('[SUPABASE] Error en createPendingDonation:', error);
    return null;
  }
}

/**
 * Busca una donación por order_id
 */
export async function getDonationByOrder(orderId, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${orderId}&select=*`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(env)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SUPABASE] Error buscando donación:', error);
      return null;
    }

    const donations = await response.json();
    return donations.length > 0 ? donations[0] : null;
  } catch (error) {
    console.error('[SUPABASE] Error en getDonationByOrder:', error);
    return null;
  }
}

/**
 * Actualiza el estado de una donación
 * data = { order_id, estado?, payku_transaction_id?, payku_status?, paid_at? }
 */
export async function updateDonationStatus(data, env) {
  try {
    const { order_id, ...updateFields } = data;

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(env),
        body: JSON.stringify(updateFields)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SUPABASE] Error actualizando donación:', error);
      return null;
    }

    const donations = await response.json();
    return donations[0];
  } catch (error) {
    console.error('[SUPABASE] Error en updateDonationStatus:', error);
    return null;
  }
}

/**
 * Busca un equipo por slug
 */
export async function getTeamBySlug(slug, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/teams?slug=eq.${slug}&select=*`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(env)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[SUPABASE] Error buscando equipo:', error);
      return null;
    }

    const teams = await response.json();
    return teams.length > 0 ? teams[0] : null;
  } catch (error) {
    console.error('[SUPABASE] Error en getTeamBySlug:', error);
    return null;
  }
}

/**
 * Registra un evento de webhook para debugging
 */
export async function logWebhookEvent(data, env) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/webhook_events`, {
      method: 'POST',
      headers: getSupabaseHeaders(env),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SUPABASE] Error logueando webhook:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SUPABASE] Error en logWebhookEvent:', error);
    return false;
  }
}