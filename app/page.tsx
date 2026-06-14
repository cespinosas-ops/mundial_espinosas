'use client'
import { useEffect, useState } from 'react'
import { supabase, Player, Match, Prediction, GlobalBet, Config } from '@/lib/supabase'

type Standing = {
  player: Player
  matchPts: number
  globalPts: number
  total: number
  correct: number
  exact: number
  played: number
}

type MatchWithPreds = Match & { predictions: (Prediction & { player: Player })[] }

export default function Home() {
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<MatchWithPreds[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: players }, { data: matchesRaw }, { data: preds }, { data: globalBets }, { data: cfgArr }] =
      await Promise.all([
        supabase.from('players').select('*').order('created_at'),
        supabase.from('matches').select('*').order('match_date', { ascending: true }),
        supabase.from('predictions').select('*'),
        supabase.from('global_bets').select('*'),
        supabase.from('config').select('*').eq('id', 1),
      ])

    if (!players || !matchesRaw || !preds || !globalBets) { setLoading(false); return }

    const cfg: Config = cfgArr?.[0] ?? { id: 1, champion_pts: 20, scorer_pts: 15, keeper_pts: 10, mvp_pts: 10, exact_score_pts: 5, winner_only_pts: 2, draw_exact_pts: 5, draw_only_pts: 2, ud_exact_score_pts: 10, ud_winner_only_pts: 5, ud_draw_exact_pts: 8, ud_draw_only_pts: 4 }

    const standingMap: Record<string, Standing> = {}
    players.forEach(p => { standingMap[p.id] = { player: p, matchPts: 0, globalPts: 0, total: 0, correct: 0, exact: 0, played: 0 } })

    preds.forEach(pr => {
      if (!standingMap[pr.player_id]) return
      standingMap[pr.player_id].matchPts += pr.points_earned ?? 0
      if ((pr.points_earned ?? 0) > 0) standingMap[pr.player_id].correct++
      const m = matchesRaw.find(x => x.id === pr.match_id)
      if (m && m.result_home !== null) {
        standingMap[pr.player_id].played++
        if (pr.home_goals === m.result_home && pr.away_goals === m.result_away) {
          standingMap[pr.player_id].exact++
        }
      }
    })
    globalBets.forEach(gb => {
      if (!standingMap[gb.player_id]) return
      standingMap[gb.player_id].globalPts = gb.points_earned ?? 0
    })
    Object.values(standingMap).forEach(s => { s.total = s.matchPts + s.globalPts })

    const sorted = Object.values(standingMap).sort((a, b) => b.total - a.total)
    setStandings(sorted)

    const matchesWithPreds: MatchWithPreds[] = matchesRaw.map(m => ({
      ...m,
      predictions: preds
        .filter(p => p.match_id === m.id)
        .map(p => ({ ...p, player: players.find(pl => pl.id === p.player_id)! }))
        .filter(p => p.player)
    }))
    setMatches(matchesWithPreds)
    setLoading(false)
  }

  const medals = ['🥇', '🥈', '🥉']
  const played = matches.filter(m => m.result_home !== null)
  const today = new Date()
  const todayPlayed = played.filter(m => {
    if (!m.match_date) return false
    const d = new Date(m.match_date)
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Tabla de posiciones</h1>
        <p className="text-sm text-slate-400">{played.length} partido{played.length !== 1 ? 's' : ''} jugado{played.length !== 1 ? 's' : ''} · {matches.length - played.length} pendiente{matches.length - played.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Cargando...</div>
      ) : standings.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center text-slate-400 text-sm">
          Aún no hay jugadores. El admin debe agregar participantes primero.
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs text-slate-500 font-medium px-2 sm:px-4 py-3">#</th>
                <th className="text-left text-xs text-slate-500 font-medium px-2 sm:px-4 py-3">Jugador</th>
                <th className="text-right text-xs text-slate-500 font-medium px-2 sm:px-4 py-3 hidden sm:table-cell">Jugados</th>
                <th className="text-right text-xs text-slate-500 font-medium px-2 sm:px-4 py-3 hidden sm:table-cell">Exactos</th>
                <th className="text-right text-xs text-slate-500 font-medium px-2 sm:px-4 py-3"><span className="sm:hidden">Part.</span><span className="hidden sm:inline">Pts partidos</span></th>
                <th className="text-right text-xs text-slate-500 font-medium px-2 sm:px-4 py-3"><span className="sm:hidden">Glob.</span><span className="hidden sm:inline">Pts globales</span></th>
                <th className="text-right text-xs text-slate-500 font-medium px-2 sm:px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player.id} className={`border-b border-slate-700/40 last:border-0 ${i === 0 ? 'bg-purple-500/10' : ''}`}>
                  <td className="px-2 sm:px-4 py-3 text-sm text-slate-400">{medals[i] ?? i + 1}</td>
                  <td className="px-2 sm:px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0">{s.player.emoji}</span>
                      <span className="font-medium text-sm text-white">{s.player.name}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right text-sm text-slate-500 hidden sm:table-cell">{s.played}</td>
                  <td className="px-2 sm:px-4 py-3 text-right text-sm text-slate-500 hidden sm:table-cell">{s.exact}</td>
                  <td className="px-2 sm:px-4 py-3 text-right text-sm text-slate-300">{s.matchPts}</td>
                  <td className="px-2 sm:px-4 py-3 text-right text-sm text-slate-300">{s.globalPts}</td>
                  <td className="px-2 sm:px-4 py-3 text-right font-bold text-purple-400">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Match results detail */}
      {todayPlayed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Resultados de hoy</h2>
            <a href="/apuestas" className="text-sm text-purple-400 hover:text-purple-300">Ver todo el historial →</a>
          </div>
          <div className="space-y-3">
            {todayPlayed.map(m => (
              <div key={m.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{m.phase}</span>
                    {m.underdog && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                        No fav: {m.underdog === 'home' ? m.home : m.away} (#{m.underdog === 'home' ? m.home_ranking : m.away_ranking} FIFA)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-400 text-sm">{m.result_home} - {m.result_away}</span>
                </div>
                <div className="text-sm font-medium text-slate-200 mb-3">{m.home} vs {m.away}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {m.predictions.map(p => {
                    const won = (p.points_earned ?? 0) > 0
                    return (
                      <div key={p.id} className={`rounded-lg p-2 text-xs ${won ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-900/50'}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <span>{p.player.emoji}</span>
                          <span className="font-medium text-slate-300">{p.player.name}</span>
                        </div>
                        <div className="text-slate-400">
                          {p.picked_team === 'home' ? m.home : p.picked_team === 'away' ? m.away : 'Empate'}
                          {p.home_goals !== null ? ` (${p.home_goals}-${p.away_goals})` : ''}
                        </div>
                        <div className={`font-semibold ${won ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {p.points_earned ?? 0} pts
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
