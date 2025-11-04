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
  limit?: number;
}

export default function TeamRanking({ currentTeam, limit = 5 }: TeamRankingProps) {
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
      // Limitar a TOP N equipos
      setTeams(result.data.slice(0, limit));
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
  }, [supabaseUrl, anonKey, limit]);

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
      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border-2 border-gray-100 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <p className="text-yellow-800 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border-2 border-gray-100">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ranking</h2>
        <p className="text-gray-600 text-sm mb-6">TOP {limit} EQUIPOS</p>
        <p className="text-gray-500 text-center py-8">
          Aún no hay donaciones registradas
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border-2 border-isf-celeste/20">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Ranking
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        TOP {limit} EQUIPOS
      </p>

      {/* Lista de equipos */}
      <div className="space-y-3">
        {teams.map((team, index) => {
          const position = index + 1;
          const isCurrentTeam = currentTeam && team.slug === currentTeam;
          
          return (
            <div
              key={team.slug}
              className={`
                flex items-center justify-between p-4 rounded-lg border-2 transition-all
                ${isCurrentTeam
                  ? 'border-isf-celeste bg-gradient-to-r from-isf-celeste/10 to-isf-celeste/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-10 text-center">
                  {getPositionEmoji(position) ? (
                    <span className="text-3xl">{getPositionEmoji(position)}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-500">#{position}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {team.name}
                    </h3>
                    {isCurrentTeam && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-isf-celeste text-white flex-shrink-0">
                        Tu equipo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {team.donaciones_count} {team.donaciones_count === 1 ? 'donación' : 'donaciones'}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(team.total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}