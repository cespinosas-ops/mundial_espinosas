'use client'
import { useEffect, useState } from 'react'
import { supabase, Player, Match, Prediction } from '@/lib/supabase'

type MatchWithPreds = Match & {
  predictions: (Prediction & { player: Player })[]
}

type GlobalBetWithPlayer = {
  id: string
  player_id: string
  champion: string | null
  scorer: string | null
  keeper: string | null
  points_earned: number | null
  player: Player
}

export default function ApuestasPage() {
  const [matches, setMatches] = useState<MatchWithPreds[]>([])
  const [globalBets, setGlobalBets] = useState<GlobalBetWithPlayer[]>([])
  const [selected, setSelected] = useState<string>('')
  const [tab, setTab] = useState<'partidos' | 'globales'>('partidos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: preds }, { data: players }, { data: gb }] = await Promise.all([
        supabase.from('matches').select('*').order('match_date', { ascending: true }),
        supabase.from('predictions').select('*'),
        supabase.from('players').select('*'),
        supabase.from('global_bets').select('*'),
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
      if (gb && players) {
        setGlobalBets(
          gb.map(g => ({ ...g, player: players.find(p => p.id === g.player_id)! }))
            .filter(g => g.player) as GlobalBetWithPlayer[]
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  function pickLabel(pred: Prediction, match: Match) {
    if (pred.picked_team === 'home') return match.home
    if (pred.picked_team === 'away') return match.away
    return 'Empate'
  }

  const phases = Array.from(new Set(matches.map(m => m.phase)))
  const match = matches.find(m => m.id === selected)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Apuestas públicas</h1>
        <p className="text-sm text-gray-500">Todas las predicciones del torneo</p>
      </div>

      {loading ? <div className="text-gray-400 text-sm">Cargando...</div> : (
        <>
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            <button onClick={() => setTab('partidos')}
              className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'partidos' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500')}>
              Por partido
            </button>
            <button onClick={() => setTab('globales')}
              className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'globales' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500')}>
              Apuestas globales
            </button>
          </div>

          {tab === 'globales' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-4">Apuestas de cada jugador antes del mundial</p>
              {globalBets.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nadie ha hecho apuestas globales aún</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">Jugador</th>
                        <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">🏆 Campeón</th>
                        <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">⚽ Goleador</th>
                        <th className="text-left text-xs text-gray-400 font-medium py-2">🧤 Arquero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalBets.map(gb => (
                        <tr key={gb.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span>{gb.player.emoji}</span>
                              <span className="font-medium text-gray-900">{gb.player.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">{gb.champion || <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 pr-4 text-gray-600">{gb.scorer || <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 text-gray-600">{gb.keeper || <span className="text-gray-300">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'partidos' && (
            <div className="flex gap-4 items-start">
              <div className="w-60 shrink-0 max-h-[80vh] overflow-y-auto space-y-0.5">
                {phases.map(phase => (
                  <div key={phase}>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 py-2">{phase}</div>
                    {matches.filter(m => m.phase === phase).map(m => (
                      <button key={m.id} onClick={() => setSelected(m.id)}
                        className={"w-full text-left px-3 py-2 rounded-lg text-sm transition-all " + (selected === m.id ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 text-gray-700')}>
                        <div className="font-medium leading-tight">{m.home} vs {m.away}</div>
                        <div className={"text-xs mt-0.5 " + (selected === m.id ? 'text-purple-200' : 'text-gray-400')}>
                          {m.match_date ? new Date(m.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          {m.result_home !== null ? ' · ' + m.result_home + '-' + m.result_away : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex-1 sticky top-4">
                {match && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{match.phase}</span>
                      {match.match_date && <span className="text-xs text-gray-400">{new Date(match.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                      {match.result_home !== null && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Resultado: {match.result_home} - {match.result_away}</span>}
                      {match.underdog && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">No fav: {match.underdog === 'home' ? match.home : match.away}</span>}
                    </div>
                    <div className="grid grid-cols-3 items-center mb-5">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{match.home}</div>
                        {match.home_ranking && <div className="text-xs text-gray-400">#{match.home_ranking} FIFA</div>}
                      </div>
                      <div className="text-center">
                        {match.result_home !== null
                          ? <div className="text-2xl font-bold text-gray-900">{match.result_home} - {match.result_away}</div>
                          : <div className="text-gray-300 text-sm">vs</div>}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{match.away}</div>
                        {match.away_ranking && <div className="text-xs text-gray-400">#{match.away_ranking} FIFA</div>}
                      </div>
                    </div>
                    {match.predictions.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Nadie ha apostado aún</div>
                    ) : (
                      <div className="space-y-2">
                        {match.predictions.map(pred => {
                          const won = (pred.points_earned ?? 0) > 0
                          const ud = !!(match.underdog && pred.picked_team === match.underdog)
                          return (
                            <div key={pred.id} className={"flex items-center justify-between px-4 py-3 rounded-lg border " + (won ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-transparent')}>
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{pred.player.emoji}</span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{pred.player.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {pickLabel(pred, match)}
                                    {pred.home_goals !== null ? ' · ' + pred.home_goals + '-' + pred.away_goals : ''}
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
        </>
      )}
    </div>
  )
}
