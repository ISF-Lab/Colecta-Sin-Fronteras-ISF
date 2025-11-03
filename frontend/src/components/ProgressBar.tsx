import { useState, useEffect } from 'react';
import { fetchStats } from '../lib/api.js';

interface Stats {
  total_recaudado: number;
  meta: number;
  total_donaciones: number;
}

export default function ProgressBar() {
  const [stats, setStats] = useState<Stats>({
    total_recaudado: 0,
    meta: 25000,
    total_donaciones: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener variables de entorno
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  // Función para formatear números con separador de miles
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función para cargar stats
  const loadStats = async () => {
    if (!supabaseUrl || !anonKey) {
      setError('Configuración incompleta');
      setLoading(false);
      return;
    }

    const result = await fetchStats(supabaseUrl, anonKey);
    
    if (result.ok && result.data) {
      setStats(result.data);
      setError(null);
    } else {
      setError('No se pudo cargar las estadísticas');
    }
    
    setLoading(false);
  };

  // Effect para cargar y actualizar stats cada 10 segundos
  useEffect(() => {
    loadStats();
    
    const interval = setInterval(() => {
      loadStats();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [supabaseUrl, anonKey]);

  // Calcular porcentaje
  const percentage = Math.min(
    Math.round((stats.total_recaudado / stats.meta) * 100),
    100
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Título */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Progreso de la Colecta</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {stats.total_donaciones} {stats.total_donaciones === 1 ? 'donación' : 'donaciones'}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="relative">
        <div className="overflow-hidden h-6 text-xs flex rounded-full bg-gray-200">
          <div
            style={{ width: `${percentage}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-isf-blue to-blue-600 transition-all duration-1000 ease-out"
          >
            {percentage > 15 && (
              <span className="font-semibold">{percentage}%</span>
            )}
          </div>
        </div>
        {percentage <= 15 && (
          <span className="absolute top-0 right-2 text-xs font-semibold text-gray-600">
            {percentage}%
          </span>
        )}
      </div>

      {/* Montos */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm text-gray-600">Recaudado</p>
          <p className="text-2xl font-bold text-isf-blue">
            {formatCurrency(stats.total_recaudado)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Meta</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.meta)}
          </p>
        </div>
      </div>

      {/* Mensaje motivacional */}
      {percentage >= 100 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold text-center">
            🎉 ¡Meta alcanzada! Gracias a todos los que donaron
          </p>
        </div>
      ) : percentage >= 75 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm text-center">
            🚀 ¡Estamos cerca! Faltan {formatCurrency(stats.meta - stats.total_recaudado)} para la meta
          </p>
        </div>
      ) : null}
    </div>
  );
}