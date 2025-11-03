import { useState, useEffect, useRef } from 'react';
import { submitDonation } from '../lib/api.js';

interface DonationFormProps {
  teamSlug?: string;
}

type FormState = 'idle' | 'loading' | 'error' | 'success';

export default function DonationForm({ teamSlug = 'general' }: DonationFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string>('');

  const backendUrl = import.meta.env.PUBLIC_BACKEND_URL;
  const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

  // Inicializar Turnstile cuando el componente se monte
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const initTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
        try {
          turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
            },
            'error-callback': () => {
              setError('Error al verificar que no eres un bot. Intenta recargar la página.');
            },
            theme: 'light',
            size: 'normal',
          });
        } catch (err) {
          console.error('Error rendering Turnstile:', err);
        }
      }
    };

    // Si Turnstile ya está cargado, inicializar
    if (window.turnstile) {
      initTurnstile();
    } else {
      // Si no, esperar a que se cargue
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          initTurnstile();
          clearInterval(checkTurnstile);
        }
      }, 100);

      return () => clearInterval(checkTurnstile);
    }
  }, [turnstileSiteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');
    setError('');

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const monto = parseInt(formData.get('monto') as string);
    const mensaje = formData.get('mensaje') as string;

    // Validaciones client-side
    if (!nombre || nombre.trim().length < 2) {
      setError('Por favor ingresa tu nombre completo');
      setState('error');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido');
      setState('error');
      return;
    }

    if (!monto || monto < 1000 || monto > 500000) {
      setError('El monto debe estar entre $1.000 y $500.000');
      setState('error');
      return;
    }

    if (mensaje && mensaje.length > 500) {
      setError('El mensaje no puede superar los 500 caracteres');
      setState('error');
      return;
    }

    if (!turnstileToken) {
      setError('Por favor completa la verificación de seguridad');
      setState('error');
      return;
    }

    // Enviar donación
    const result = await submitDonation(backendUrl, {
      nombre: nombre.trim(),
      email: email.trim(),
      monto,
      mensaje: mensaje?.trim() || '',
      team_slug: teamSlug,
      'cf-turnstile-response': turnstileToken,
    });

    if (result.ok && result.url) {
      setState('success');
      // Redirigir a Payku
      window.location.href = result.url;
    } else {
      setError(result.message || 'Ocurrió un error al procesar tu donación');
      setState('error');
      
      // Resetear Turnstile
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Realiza tu Donación
      </h2>
      <p className="text-gray-600 mb-6">
        {teamSlug !== 'general' 
          ? `Estás donando para el equipo: ${teamSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
          : 'Tu aporte ayudará a cumplir nuestra meta'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            required
            minLength={2}
            maxLength={100}
            disabled={state === 'loading'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Juan Pérez"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={state === 'loading'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="juan@ejemplo.com"
          />
        </div>

        {/* Monto */}
        <div>
          <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
            Monto a donar * (CLP)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-2 text-gray-500">$</span>
            <input
              type="number"
              id="monto"
              name="monto"
              required
              min={1000}
              max={500000}
              step={1000}
              disabled={state === 'loading'}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="10000"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Monto entre $1.000 y $500.000
          </p>
        </div>

        {/* Mensaje opcional */}
        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje (opcional)
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={3}
            maxLength={500}
            disabled={state === 'loading'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            placeholder="¡Vamos equipo!"
          />
          <p className="mt-1 text-xs text-gray-500">
            Máximo 500 caracteres
          </p>
        </div>

        {/* Cloudflare Turnstile */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verificación de seguridad *
          </label>
          <div ref={turnstileRef}></div>
        </div>

        {/* Error message */}
        {state === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              ❌ {error}
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={state === 'loading' || !turnstileToken}
          className="w-full bg-isf-blue hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {state === 'loading' ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Procesando...</span>
            </>
          ) : (
            <span>💳 Donar ahora</span>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Serás redirigido a Payku para completar el pago de forma segura
        </p>
      </form>
    </div>
  );
}