/**
 * UTILIDADES DE RESPUESTA HTTP
 * Helpers para retornar respuestas JSON consistentes
 */

/**
 * Headers CORS para permitir requests desde el frontend
 */
export function corsHeaders(frontendUrl = '*') {
  return {
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 horas
  };
}

/**
 * Retorna una respuesta JSON exitosa
 */
export function jsonResponse(data, status = 200, frontendUrl = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(frontendUrl)
    }
  });
}

/**
 * Retorna una respuesta JSON de error
 * 
 * @param {string} code - Código de error (ej: 'VALIDATION_ERROR')
 * @param {string} message - Mensaje legible para el usuario
 * @param {number} status - HTTP status code (default: 400)
 * @param {string} frontendUrl - URL del frontend para CORS
 */
export function jsonError(code, message, status = 400, frontendUrl = '*') {
  return new Response(JSON.stringify({
    ok: false,
    error: code,
    message: message
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(frontendUrl)
    }
  });
}