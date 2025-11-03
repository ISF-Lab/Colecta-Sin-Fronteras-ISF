import { useState, useEffect } from 'react';
import { fetchRanking } from '../lib/api.js';

interface Team {
  slug: string;
  name: string;
  total: number;
  donaciones_count: number;
}

interface TeamRankingProps {
  currentTeam?: string;
}

export default function TeamRanking({ currentTeam }: TeamRankingProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const loadRanking = async () => {
    if (!supabaseUrl || !anonKey) {
      setError('Configuración incompleta');
      setLoading(false);
      return;
    }

    const result = await fetchRanking(supabaseUrl, anonKey);
    
    if (result.ok && result.data) {
      setTeams(result.data);
      setError(null);
    } else {
      setError('No se pudo cargar el ranking');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadRanking();
    
    const interval = setInterval(() => {
      loadRanking();
    }, 10000);

    return () => clearInterval(interval);
  }, [supabaseUrl, anonKey]);

  // Emoji para las posiciones
  const getPositionEmoji = (position: number): string => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/2 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
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

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ranking de Equipos</h2>
        <p className="text-gray-600 text-center py-8">
          Aún no hay donaciones registradas
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        🏆 Ranking de Equipos
      </h2>

      {/* Vista de escritorio: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posición
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Recaudado
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Donaciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team, index) => {
              const position = index + 1;
              const isCurrentTeam = currentTeam && team.slug === currentTeam;
              
              return (
                <tr
                  key={team.slug}
                  className={isCurrentTeam ? 'bg-blue-50 border-l-4 border-isf-blue' : ''}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getPositionEmoji(position)}</span>
                      <span className="text-sm font-medium text-gray-900">#{position}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{team.name}</span>
                      {isCurrentTeam && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-isf-blue text-white">
                          Tu equipo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(team.total)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {team.donaciones_count}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista móvil: cards */}
      <div className="md:hidden space-y-3">
        {teams.map((team, index) => {
          const position = index + 1;
          const isCurrentTeam = currentTeam && team.slug === currentTeam;
          
          return (
            <div
              key={team.slug}
              className={`rounded-lg p-4 border-2 ${
                isCurrentTeam
                  ? 'border-isf-blue bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getPositionEmoji(position)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-xs text-gray-500">Posición #{position}</p>
                  </div>
                </div>
                {isCurrentTeam && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-isf-blue text-white">
                    Tu equipo
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(team.total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Donaciones</p>
                  <p className="text-lg font-bold text-gray-900">
                    {team.donaciones_count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}