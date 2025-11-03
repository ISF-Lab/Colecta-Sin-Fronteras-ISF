/**
 * Cliente API para Colecta ISF
 * Funciones para interactuar con backend y Supabase
 */

/**
 * Obtiene las estadísticas globales de la campaña
 * @param {string} supabaseUrl - URL de Supabase
 * @param {string} anonKey - Anon key de Supabase
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function fetchStats(supabaseUrl, anonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/public_stats?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // La view retorna un array con un solo objeto
    return { ok: true, data: data[0] || { total_recaudado: 0, meta: 25000, total_donaciones: 0 } };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene el ranking de equipos
 * @param {string} supabaseUrl - URL de Supabase
 * @param {string} anonKey - Anon key de Supabase
 * @returns {Promise<{ok: boolean, data?: Array, error?: string}>}
 */
export async function fetchRanking(supabaseUrl, anonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/team_rankings?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { ok: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Envía una donación al backend
 * @param {string} backendUrl - URL del backend Worker
 * @param {object} data - Datos de la donación
 * @returns {Promise<{ok: boolean, url?: string, order?: string, error?: string, message?: string}>}
 */
export async function submitDonation(backendUrl, data) {
  try {
    const response = await fetch(`${backendUrl}/api/donar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: result.error || 'ERROR_DESCONOCIDO',
        message: result.message || 'Ocurrió un error al procesar tu donación',
      };
    }

    return {
      ok: true,
      url: result.url,
      order: result.order,
    };
  } catch (error) {
    console.error('Error submitting donation:', error);
    return {
      ok: false,
      error: 'ERROR_RED',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
    };
  }
}