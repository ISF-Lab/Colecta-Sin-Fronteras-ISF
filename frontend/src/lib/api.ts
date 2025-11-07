/**
 * Cliente API para Colecta ISF
 * Funciones para interactuar con backend y Supabase
 */

export interface Stats {
  total_recaudado: number;
  meta: number;
  total_donaciones: number;
}

export interface Team {
  id?: number;
  nombre?: string;
  total_recaudado?: number;
  donaciones?: number;
}

/** Estructura del payload para /api/donar */
export interface DonationData {
  nombre: string;
  email: string;
  monto: number;
  mensaje?: string;
  team_slug: string;
  'cf-turnstile-response': string;
}

/**
 * Obtiene las estadísticas globales de la campaña
 * @param supabaseUrl - URL de Supabase
 * @param anonKey - Anon key de Supabase
 * @returns Promise con { ok, data, error }
 */
export async function fetchStats(
  supabaseUrl: string,
  anonKey: string
): Promise<{ ok: boolean; data?: Stats; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/public_stats?select=*`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // La view retorna un array con un solo objeto
    return {
      ok: true,
      data: data[0] || { total_recaudado: 0, meta: 25000, total_donaciones: 0 },
    };
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene el ranking de equipos
 * @param supabaseUrl - URL de Supabase
 * @param anonKey - Anon key de Supabase
 * @returns Promise con { ok, data, error }
 */
export async function fetchRanking(
  supabaseUrl: string,
  anonKey: string
): Promise<{ ok: boolean; data?: Team[]; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/team_rankings?select=*`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { ok: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching ranking:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Envía una donación al backend
 * @param backendUrl - URL del backend Worker
 * @param data - Datos del formulario de donación (DonationData)
 * @returns Promise con { ok, url, order, error, message }
 */
export async function submitDonation(
  backendUrl: string,
  data: DonationData
): Promise<{
  ok: boolean;
  url?: string;
  order?: string;
  error?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${backendUrl}/api/donar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    return { ok: true, url: result.url, order: result.order };
  } catch (error: any) {
    console.error('Error submitting donation:', error);
    return {
      ok: false,
      error: 'ERROR_RED',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
    };
  }
}

/**
 * Consulta el estado de una donación por order_id
 * @param backendUrl - URL del backend Worker
 * @param orderId - Order ID de la donación
 * @returns Promise con { ok, pagado, estado, error }
 */
export async function checkDonationStatus(
  backendUrl: string,
  orderId: string
): Promise<{
  ok: boolean;
  pagado?: boolean;
  estado?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${backendUrl}/api/donacion/${orderId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: result.error || 'ERROR_DESCONOCIDO',
      };
    }

    return {
      ok: true,
      pagado: result.pagado,
      estado: result.estado,
    };
  } catch (error: any) {
    console.error('Error checking donation status:', error);
    return {
      ok: false,
      error: 'ERROR_RED',
    };
  }
}