import { useState, useEffect, useRef } from 'react';
import { submitDonation } from '../lib/api.js';

interface DonationFormProps {
  teamSlug?: string;
}

type FormState = 'idle' | 'loading' | 'error' | 'success';

const PRESET_AMOUNTS = [10000, 15000, 25000, 50000];

export default function DonationForm({ teamSlug = 'general' }: DonationFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
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

    if (window.turnstile) {
      initTurnstile();
    } else {
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          initTurnstile();
          clearInterval(checkTurnstile);
        }
      }, 100);

      return () => clearInterval(checkTurnstile);
    }
  }, [turnstileSiteKey]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
  };

  const getFinalAmount = (): number => {
    if (customAmount) {
      return parseInt(customAmount);
    }
    return selectedAmount || 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');
    setError('');

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const mensaje = formData.get('mensaje') as string;
    const monto = getFinalAmount();

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
      setError('Debes seleccionar un monto o ingresar uno entre $1.000 y $500.000');
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
    <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border-2 border-isf-celeste/20">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Haz tu donación
      </h2>
      <p className="text-gray-600 mb-6 text-sm md:text-base">
        Cada aporte se transforma en una <span className="font-semibold text-isf-azul">solución real</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Montos predefinidos - destacados */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Monto *
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAmountClick(amount)}
                disabled={state === 'loading'}
                className={`
                  px-4 py-3 rounded-lg font-bold transition-all text-sm
                  ${selectedAmount === amount
                    ? 'bg-gradient-to-br from-isf-naranja to-orange-600 text-white shadow-lg scale-[1.02] ring-2 ring-isf-naranja ring-offset-2'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>
          
          {/* Monto personalizado */}
          <div className="relative">
            <label htmlFor="custom-amount" className="block text-xs text-gray-600 mb-1 font-medium">
              Otro monto (CLP)
            </label>
            <span className="absolute left-4 top-8 text-gray-500">$</span>
            <input
              type="number"
              id="custom-amount"
              value={customAmount}
              onChange={handleCustomAmountChange}
              min={1000}
              max={500000}
              step={1000}
              disabled={state === 'loading'}
              className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-celeste focus:border-isf-celeste disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              placeholder="15000"
            />
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-semibold text-gray-900 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            required
            minLength={2}
            maxLength={100}
            disabled={state === 'loading'}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-celeste focus:border-isf-celeste disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            placeholder="Juan Pérez"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={state === 'loading'}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-celeste focus:border-isf-celeste disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            placeholder="juan@ejemplo.com"
          />
        </div>

        {/* Mensaje opcional */}
        <div>
          <label htmlFor="mensaje" className="block text-sm font-semibold text-gray-900 mb-1">
            Mensaje de apoyo (opcional)
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={3}
            maxLength={500}
            disabled={state === 'loading'}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-isf-celeste focus:border-isf-celeste disabled:bg-gray-100 disabled:cursor-not-allowed resize-none transition-colors"
            placeholder="¡Vamos equipo!"
          />
        </div>

        {/* Cloudflare Turnstile */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Verificación de seguridad *
          </label>
          <div ref={turnstileRef}></div>
        </div>

        {/* Error message */}
        {state === 'error' && error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">
              ❌ {error}
            </p>
          </div>
        )}

        {/* Submit button - MÁS DESTACADO */}
        <button
          type="submit"
          disabled={state === 'loading' || !turnstileToken || getFinalAmount() === 0}
          className="w-full bg-gradient-to-r from-isf-naranja to-orange-600 hover:from-orange-600 hover:to-isf-naranja text-white font-bold py-4 px-6 rounded-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
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
            <span>💖 Donar Ahora</span>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Tu pago será procesado de forma segura por <span className="font-semibold">Payku</span>
        </p>

        {/* Separador */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">
              Si necesitas otra alternativa
            </span>
          </div>
        </div>

        {/* Link a PayPal */}
        <a
          href="https://www.paypal.com/paypalme/isfchile"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full border-2 border-gray-300 hover:border-[#0070BA] text-gray-700 hover:text-[#0070BA] font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 01-.793.679H7.72a.483.483 0 01-.477-.558L7.418 20h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z"/>
            <path d="M2.379 0h9.343a3.94 3.94 0 013.91 3.39l.714 4.53c.473-2.737-.062-4.653-1.674-6.28C13.295.197 11.248 0 8.87 0H2.38z"/>
          </svg>
          <span>Link a pago por PayPal</span>
        </a>
      </form>
    </div>
  );
}