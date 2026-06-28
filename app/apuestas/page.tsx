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
  const [selectedPhase, setSelectedPhase] = useState<string>('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
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
      if (enriched.length > 0) {
        const next = enriched.find(x => x.result_home === null) ?? enriched[enriched.length - 1]
        setSelectedPhase(next.phase)
      }
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

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function fmtDate(d: string | null) {
    return d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  }

  const phases = Array.from(new Set(matches.map(m => m.phase)))
  const phaseMatches = matches.filter(m => m.phase === selectedPhase)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Apuestas públicas</h1>
        <p className="text-sm text-slate-400">Todas las predicciones del torneo</p>
      </div>

      {loading ? <div className="text-slate-500 text-sm">Cargando...</div> : (
        <>
          <div className="flex gap-1 border-b border-slate-700 mb-6">
            <button onClick={() => setTab('partidos')}
              className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'partidos' ? 'border-purple-500 text-purple-400 font-semibold' : 'border-transparent text-slate-500')}>
              Por partido
            </button>
            <button onClick={() => setTab('globales')}
              className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'globales' ? 'border-purple-500 text-purple-400 font-semibold' : 'border-transparent text-slate-500')}>
              Apuestas globales
            </button>
          </div>

          {tab === 'globales' && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <p className="text-sm text-slate-400 mb-4">Apuestas de cada jugador antes del mundial</p>
              {globalBets.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Nadie ha hecho apuestas globales aún</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Jugador</th>
                        <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">🏆 Campeón</th>
                        <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">⚽ Goleador</th>
                        <th className="text-left text-xs text-slate-500 font-medium py-2">🧤 Arquero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalBets.map(gb => (
                        <tr key={gb.id} className="border-b border-slate-700/40 last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span>{gb.player.emoji}</span>
                              <span className="font-medium text-white">{gb.player.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-300">{gb.champion || <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 pr-4 text-slate-300">{gb.scorer || <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 text-slate-300">{gb.keeper || <span className="text-slate-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'partidos' && (
            <>
              <div className="flex flex-wrap gap-2 mb-5">
                {phases.map(phase => {
                  const count = matches.filter(m => m.phase === phase).length
                  const active = selectedPhase === phase
                  return (
                    <button key={phase} onClick={() => setSelectedPhase(phase)}
                      className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (active ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200')}>
                      {phase} <span className={active ? 'text-purple-200' : 'text-slate-600'}>{count}</span>
                    </button>
                  )
                })}
              </div>

              {phaseMatches.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No hay partidos en esta fase todavía</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {phaseMatches.map(m => {
                    const isOpen = expanded.has(m.id)
                    const played = m.result_home !== null
                    const n = m.predictions.length
                    return (
                      <div key={m.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <span className="text-xs text-slate-500">{fmtDate(m.match_date)}</span>
                            {played
                              ? <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">Final {m.result_home}-{m.result_away}</span>
                              : <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">Por jugarse</span>}
                          </div>
                          <div className="grid grid-cols-3 items-center gap-2">
                            <div className="text-center min-w-0">
                              <div className="font-semibold text-white truncate">{m.home}</div>
                              {m.home_ranking && <div className="text-xs text-slate-500">#{m.home_ranking} FIFA</div>}
                            </div>
                            <div className="text-center">
                              {played
                                ? <div className="text-xl font-bold text-white">{m.result_home}-{m.result_away}</div>
                                : <div className="text-slate-600 text-sm">vs</div>}
                            </div>
                            <div className="text-center min-w-0">
                              <div className="font-semibold text-white truncate">{m.away}</div>
                              {m.away_ranking && <div className="text-xs text-slate-500">#{m.away_ranking} FIFA</div>}
                            </div>
                          </div>
                          {m.underdog && (
                            <div className="text-xs text-amber-300/90 text-center mt-3">⚡ No favorito: {m.underdog === 'home' ? m.home : m.away}</div>
                          )}
                        </div>

                        <button onClick={() => toggle(m.id)}
                          className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800/60 transition-colors">
                          <span>{n === 0 ? 'Sin apuestas' : n + (n === 1 ? ' apuesta' : ' apuestas')}</span>
                          <svg className={"w-4 h-4 text-slate-500 transition-transform " + (isOpen ? 'rotate-180' : '')} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4">
                            {n === 0 ? (
                              <div className="text-center py-4 text-slate-500 text-sm">Nadie ha apostado aún</div>
                            ) : (
                              <div className="space-y-2">
                                {m.predictions.map(pred => {
                                  const won = (pred.points_earned ?? 0) > 0
                                  const ud = !!(m.underdog && pred.picked_team === m.underdog)
                                  return (
                                    <div key={pred.id} className={"flex items-center justify-between px-3 py-2.5 rounded-lg border " + (won ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-transparent')}>
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-lg shrink-0">{pred.player.emoji}</span>
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-white truncate">{pred.player.name}</div>
                                          <div className="text-xs text-slate-400 mt-0.5">
                                            {pickLabel(pred, m)}
                                            {(pred.home_goals !== null || pred.away_goals !== null) ? ' · ' + (pred.home_goals ?? 0) + '-' + (pred.away_goals ?? 0) : ''}
                                            {ud ? ' ⚡' : ''}
                                          </div>
                                        </div>
                                      </div>
                                      {played && (
                                        <div className={"font-semibold text-lg shrink-0 ml-2 " + (won ? 'text-emerald-400' : 'text-slate-600')}>
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
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
