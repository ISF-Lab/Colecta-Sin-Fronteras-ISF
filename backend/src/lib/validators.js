/**
 * VALIDADORES
 * Funciones de validación de datos (fail fast)
 */

/**
 * Valida formato de email (regex simple)
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida monto de donación (1000-500000 CLP)
 */
export function validateMonto(monto) {
  const amount = Number(monto);
  
  if (isNaN(amount)) {
    return false;
  }
  
  return amount >= 1000 && amount <= 500000;
}

/**
 * Valida slug de equipo (solo letras, números, guiones)
 */
export function validateTeamSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && slug.length <= 50;
}

/**
 * Valida mensaje (máximo 500 caracteres)
 */
export function validateMessage(mensaje) {
  if (!mensaje) {
    return true; // Mensaje es opcional
  }
  
  if (typeof mensaje !== 'string') {
    return false;
  }
  
  return mensaje.length <= 500;
}

/**
 * Valida todos los datos de una donación
 * Retorna array de errores (vacío si todo OK)
 */
export function validateDonationData(body) {
  const errors = [];
  
  // Validar nombre
  if (!body.nombre || typeof body.nombre !== 'string' || body.nombre.trim().length === 0) {
    errors.push('El nombre es requerido');
  } else if (body.nombre.length > 100) {
    errors.push('El nombre debe tener máximo 100 caracteres');
  }
  
  // Validar email
  if (!validateEmail(body.email)) {
    errors.push('El email no es válido');
  }
  
  // Validar monto
  if (!validateMonto(body.monto)) {
    errors.push('El monto debe estar entre $1.000 y $500.000');
  }
  
  // Validar mensaje (opcional)
  if (!validateMessage(body.mensaje)) {
    errors.push('El mensaje debe tener máximo 500 caracteres');
  }
  
  // Validar team_slug (opcional, pero si viene debe ser válido)
  if (body.team_slug && !validateTeamSlug(body.team_slug)) {
    errors.push('El slug del equipo no es válido');
  }
  
  return errors;
}

/**
 * Valida token de Cloudflare Turnstile
 * 
 * @param {string} token - Token recibido del frontend
 * @param {string} secret - Secret key de Turnstile
 * @returns {Promise<boolean>} true si el token es válido
 */
export async function validateTurnstile(token, secret) {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: secret,
        response: token
      })
    });

    if (!response.ok) {
      console.error('[TURNSTILE] Error en la validación:', response.status);
      return false;
    }

    const result = await response.json();
    
    // Turnstile retorna: { success: true/false, error-codes: [...] }
    if (!result.success) {
      console.warn('[TURNSTILE] Validación fallida:', result['error-codes']);
    }
    
    return result.success === true;
  } catch (error) {
    console.error('[TURNSTILE] Error validando token:', error);
    return false;
  }
}