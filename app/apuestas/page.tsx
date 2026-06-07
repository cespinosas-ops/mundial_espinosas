'use client'
import { useEffect, useState } from 'react'
import { supabase, Player, Match, Prediction } from '@/lib/supabase'

type MatchWithPreds = Match & {
  predictions: (Prediction & { player: Player })[]
}

export default function ApuestasPage() {
  const [matches, setMatches] = useState<MatchWithPreds[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: preds }, { data: players }] = await Promise.all([
        supabase.from('matches').select('*').order('match_date', { ascending: true }),
        supabase.from('predictions').select('*'),
        supabase.from('players').select('*'),
      ])
      if (!m || !preds || !players) return
      const enriched: MatchWithPreds[] = m.map(match => ({
        ...match,
        predictions: preds
          .filter(p => p.match_id === match.id)
          .map(p => ({ ...p, player: players.find(pl => pl.id === p.player_id)! }))
          .filter(p => p.player)
      }))
      setMatches(enriched)
      if (enriched.length > 0) setSelected(enriched[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const match = matches.find(m => m.id === selected)
  const phases = Array.from(new Set(matches.map(m => m.phase)))

  function pickLabel(pred: Prediction, match: Match) {
    if (pred.picked_team === 'home') return match.home
    if (pred.picked_team === 'away') return match.away
    return 'Empate'
  }

  function isUd(pred: Prediction, match: Match) {
    return match.underdog && pred.picked_team === match.underdog
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Apuestas públicas</h1>
        <p className="text-sm text-gray-500">Todas las predicciones por partido</p>
      </div>
      {loading ? (
        <div className="text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-1">
            {phases.map(phase => (
              <div key={phase}>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 py-2">{phase}</div>
                {matches.filter(m => m.phase === phase).map(m => (
                  <button key={m.id} onClick={() => setSelected(m.id)}
                    className={"w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all " + (selected === m.id ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 text-gray-700')}>
                    <div className="font-medium">{m.home} vs {m.away}</div>
                    <div className={"text-xs mt-0.5 " + (selected === m.id ? 'text-purple-200' : 'text-gray-400')}>
                      {m.match_date ? new Date(m.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      {m.result_home !== null ? " · " + m.result_home + "-" + m.result_away : ''}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="md:col-span-2">
            {match && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{match.phase}</span>
                  {match.result_home !== null && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Resultado: {match.result_home} - {match.result_away}
                    </span>
                  )}
                  {match.underdog && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      No fav: {match.underdog === 'home' ? match.home : match.away}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 items-center mb-6">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{match.home}</div>
                    {match.home_ranking && <div className="text-xs text-gray-400">#{match.home_ranking} FIFA</div>}
                  </div>
                  <div className="text-center text-gray-300 text-sm font-medium">vs</div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{match.away}</div>
                    {match.away_ranking && <div className="text-xs text-gray-400">#{match.away_ranking} FIFA</div>}
                  </div>
                </div>
                {match.predictions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Nadie ha apostado en este partido aún</div>
                ) : (
                  <div className="space-y-2">
                    {match.predictions.map(pred => {
                      const won = (pred.points_earned ?? 0) > 0
                      const ud = isUd(pred, match)
                      return (
                        <div key={pred.id}
                          className={"flex items-center justify-between px-4 py-3 rounded-lg border " + (won ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-transparent')}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{pred.player.emoji}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{pred.player.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {pickLabel(pred, match)}
                                {pred.home_goals !== null ? " · " + pred.home_goals + "-" + pred.away_goals : ''}
                                {ud ? ' ⚡' : ''}
                              </div>
                            </div>
                          </div>
                          {match.result_home !== null && (
                            <div className={"font-semibold text-lg " + (won ? 'text-green-600' : 'text-gray-300')}>
                              +{pred.points_earned ?? 0}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
