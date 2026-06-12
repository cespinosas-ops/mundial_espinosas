'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Match, Prediction, GlobalBet, Config } from '@/lib/supabase'

type Session = { playerId: string; playerName: string; playerEmoji: string; isAdmin: boolean }

export default function JugadorPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [globalBet, setGlobalBet] = useState<Partial<GlobalBet>>({})
  const [config, setConfig] = useState<Config | null>(null)
  const [tab, setTab] = useState<'partidos' | 'global'>('partidos')
  const [now, setNow] = useState(new Date())
  const [loaded, setLoaded] = useState(false)
  const [globalLocked, setGlobalLocked] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  const [adminTarget, setAdminTarget] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('mundial_session')
    if (!stored) { router.push('/login'); return }
    const s: Session = JSON.parse(stored)
    setSession(s)
    if (s.isAdmin) {
      supabase.from('players').select('*').order('name').then(({data}) => setPlayers(data ?? []))
    }
    loadAll(s.playerId)
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPlayer(pid: string) {
    const [{ data: preds }, { data: gb }] = await Promise.all([
      supabase.from('predictions').select('*').eq('player_id', pid),
      supabase.from('global_bets').select('*').eq('player_id', pid).maybeSingle(),
    ])
    const predMap: Record<string, Prediction> = {}
    preds?.forEach(p => { predMap[p.match_id] = p })
    setPredictions(predMap)
    setGlobalBet(gb ?? {})
  }

  async function loadAll(playerId: string) {
    const [{ data: m }, { data: cfg }, { data: preds }, { data: gb }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('config').select('*').eq('id', 1),
      supabase.from('predictions').select('*').eq('player_id', playerId),
      supabase.from('global_bets').select('*').eq('player_id', playerId).maybeSingle(),
    ])
    const matchList = m ?? []
    setMatches(matchList)
    // Global bets lock when first match starts (or 20min before)
    if (matchList.length > 0 && matchList[0].match_date) {
      const firstMatch = new Date(matchList[0].match_date).getTime()
      setGlobalLocked(Date.now() >= firstMatch - 20 * 60 * 1000)
    }
    setConfig(cfg?.[0] ?? null)
    const predMap: Record<string, Prediction> = {}
    preds?.forEach(p => { predMap[p.match_id] = p })
    setPredictions(predMap)
    setGlobalBet(gb ?? {})
    setLoaded(true)
  }

  useEffect(() => {
    if (adminTarget) loadPlayer(adminTarget)
  }, [adminTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  function isLocked(m: Match) {
    if (!m.match_date || !session) return false
    if (session.isAdmin) return false
    const diff = new Date(m.match_date).getTime() - now.getTime()
    return diff < 20 * 60 * 1000
  }

  async function savePrediction(matchId: string, field: string, value: string | number | null) {
    if (!session) return
    const targetId = (session.isAdmin && adminTarget) ? adminTarget : session.playerId
    const existing = predictions[matchId]
    const updated = { ...existing, player_id: targetId, match_id: matchId, [field]: value }
    const { data, error } = await supabase
      .from('predictions')
      .upsert({ ...updated, points_earned: 0 }, { onConflict: 'player_id,match_id' })
      .select().single()
    if (!error && data) setPredictions(prev => ({ ...prev, [matchId]: data }))
  }

  async function clearPrediction(matchId: string) {
    if (!session) return
    const targetId = (session.isAdmin && adminTarget) ? adminTarget : session.playerId
    await supabase.from('predictions').delete().eq('player_id', targetId).eq('match_id', matchId)
    setPredictions(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }

  async function saveGlobalBet(field: string, value: string) {
    if (!session) return
    const targetId = (session.isAdmin && adminTarget) ? adminTarget : session.playerId
    const updated = { ...globalBet, player_id: targetId, [field]: value }
    const { data } = await supabase
      .from('global_bets')
      .upsert({ ...updated, points_earned: 0 }, { onConflict: 'player_id' })
      .select().single()
    if (data) setGlobalBet(data)
  }

  function getUnderdogTeam(m: Match) {
    if (!m.home_ranking || !m.away_ranking) return null
    return m.home_ranking < m.away_ranking ? m.away : m.home
  }

  if (!session || !loaded) return <div className="text-slate-500 text-sm p-8">Cargando...</div>

  const pendingMatches = matches.filter(m => m.result_home === null)
  const playedMatches = matches.filter(m => m.result_home !== null)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{session.playerEmoji}</span>
        <div>
          <h1 className="text-2xl font-bold text-white">Mis apuestas</h1>
          <p className="text-sm text-slate-400">{session.playerName}</p>
        </div>
      </div>

      {session.isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 text-sm text-amber-300 space-y-2">
          <div>👑 Modo admin — sin restricciones de tiempo</div>
          <select value={adminTarget} onChange={e => { setAdminTarget(e.target.value); if(!e.target.value) { setPredictions({}); setGlobalBet({}) } }}
            className="w-full border border-amber-500/30 rounded-lg px-3 py-1.5 text-sm bg-slate-800 text-white">
            <option value="">— Ver mis propias apuestas de admin —</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          {adminTarget && <div className="text-xs text-amber-400">Editando apuestas de: <strong>{players.find(p=>p.id===adminTarget)?.name}</strong></div>}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-700 mb-6">
        <button onClick={() => setTab('partidos')}
          className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'partidos' ? 'border-purple-500 text-purple-400 font-semibold' : 'border-transparent text-slate-500')}>
          Partidos ({pendingMatches.length} pendientes)
        </button>
        <button onClick={() => setTab('global')}
          className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === 'global' ? 'border-purple-500 text-purple-400 font-semibold' : 'border-transparent text-slate-500')}>
          Apuestas globales
        </button>
      </div>

      {tab === 'partidos' && (
        <div>
          {pendingMatches.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">No hay partidos pendientes</div>}
          <div className="space-y-4">
            {pendingMatches.map(m => {
              const pred = predictions[m.id] ?? {}
              const locked = isLocked(m)
              const udTeam = getUnderdogTeam(m)
              const homeIsFav = m.home_ranking && m.away_ranking && m.home_ranking < m.away_ranking
              const awayIsFav = m.home_ranking && m.away_ranking && m.away_ranking < m.home_ranking
              return (
                <div key={m.id} className={"bg-slate-800/50 rounded-xl border p-4 " + (locked ? 'border-red-500/30' : 'border-slate-700/50')}>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">{m.phase}</span>
                    {m.match_date && <span className="text-xs text-slate-500">{new Date(m.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    {locked && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">🔒 Cerrado</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center mb-4">
                    <div className="text-center">
                      <div className="font-semibold text-sm text-white mb-1">{m.home}</div>
                      {m.home_ranking && <div className={"text-xs px-2 py-0.5 rounded-full inline-block " + (homeIsFav ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300')}>#{m.home_ranking} {homeIsFav ? 'Fav' : 'No fav'}</div>}
                    </div>
                    <div className="text-center text-slate-600 font-medium text-sm">vs</div>
                    <div className="text-center">
                      <div className="font-semibold text-sm text-white mb-1">{m.away}</div>
                      {m.away_ranking && <div className={"text-xs px-2 py-0.5 rounded-full inline-block " + (awayIsFav ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300')}>#{m.away_ranking} {awayIsFav ? 'Fav' : 'No fav'}</div>}
                    </div>
                  </div>
                  {udTeam && !locked && <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2 mb-4">⚡ Si apostás a <strong>{udTeam}</strong> y acertás, ganás puntos extra</div>}
                  {locked ? (
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center text-sm text-slate-400">
                      {pred.picked_team ? <>Tu apuesta: <strong>{pred.picked_team === 'home' ? m.home : pred.picked_team === 'away' ? m.away : 'Empate'}</strong>{pred.home_goals !== null ? " (" + pred.home_goals + "-" + pred.away_goals + ")" : ''}</> : 'No apostaste en este partido'}
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="text-xs text-slate-400 mb-2 font-medium">¿Quién gana?</div>
                        <div className="flex gap-2">
                          {(['home', 'draw', 'away'] as const).map(opt => {
                            const label = opt === 'home' ? m.home : opt === 'away' ? m.away : 'Empate'
                            const isUd = (opt === 'home' && !homeIsFav) || (opt === 'away' && !awayIsFav)
                            return (
                              <button key={opt}
                                onClick={() => { savePrediction(m.id, 'picked_team', pred.picked_team === opt ? null : opt); if (pred.picked_team !== opt && pred.home_goals === null) { setTimeout(() => { savePrediction(m.id, 'home_goals', 0); savePrediction(m.id, 'away_goals', 0) }, 100) } }}
                                className={"flex-1 text-xs py-2.5 px-1 rounded-lg border transition-all " + (pred.picked_team === opt ? 'bg-purple-600 text-white border-purple-600 font-medium' : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-purple-400')}>
                                {label}{opt !== 'draw' && isUd ? ' ⚡' : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-slate-400 mb-2 font-medium">Marcador exacto</div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">{m.home}</div>
                            <input key={m.id + '_home_' + (predictions[m.id] ? '1' : '0')} type="number" min="0" max="20" placeholder="0" defaultValue={pred.home_goals ?? ''} onBlur={e => savePrediction(m.id, 'home_goals', e.target.value !== '' ? parseInt(e.target.value) : null)} className="w-14 border border-slate-700 bg-slate-800 text-white rounded-lg px-2 py-1.5 text-sm text-center font-medium" />
                          </div>
                          <span className="text-slate-600 text-lg mt-4">-</span>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">{m.away}</div>
                            <input key={m.id + '_away_' + (predictions[m.id] ? '1' : '0')} type="number" min="0" max="20" placeholder="0" defaultValue={pred.away_goals ?? ''} onBlur={e => savePrediction(m.id, 'away_goals', e.target.value !== '' ? parseInt(e.target.value) : null)} className="w-14 border border-slate-700 bg-slate-800 text-white rounded-lg px-2 py-1.5 text-sm text-center font-medium" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => clearPrediction(m.id)} className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-3 py-1 rounded-lg transition-all">Eliminar apuesta</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {playedMatches.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-white mb-4">Partidos jugados</h2>
              <div className="space-y-3">
                {playedMatches.map(m => {
                  const pred = predictions[m.id]
                  const pts = pred?.points_earned ?? 0
                  return (
                    <div key={m.id} className={"bg-slate-800/50 rounded-xl border p-4 " + (pts > 0 ? 'border-emerald-500/30' : 'border-slate-700/50')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{m.home} vs {m.away}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Resultado: <strong>{m.result_home} - {m.result_away}</strong> · {pred ? (pred.picked_team === 'home' ? m.home : pred.picked_team === 'away' ? m.away : 'Empate') + (pred.home_goals !== null ? " (" + pred.home_goals + "-" + pred.away_goals + ")" : '') : 'Sin predicción'}</div>
                        </div>
                        <div className={"font-bold text-xl " + (pts > 0 ? 'text-emerald-400' : 'text-slate-700')}>+{pts}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'global' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          {globalLocked && !session.isAdmin && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 mb-4 text-sm text-red-400">
              🔒 Las apuestas globales están cerradas — el mundial ya comenzó
            </div>
          )}
          <p className="text-sm text-slate-400 mb-6">Una sola apuesta por categoría antes del mundial.</p>
          {([
            { field: 'champion', label: '🏆 Campeón del mundo', placeholder: 'Ej: Argentina', pts: config?.champion_pts ?? 20 },
            { field: 'scorer', label: '⚽ Goleador del torneo', placeholder: 'Ej: Mbappé', pts: config?.scorer_pts ?? 15 },
            { field: 'keeper', label: '🧤 Mejor arquero', placeholder: 'Ej: Courtois', pts: config?.keeper_pts ?? 10 },
          ] as const).map(({ field, label, placeholder, pts }) => (
            <div key={field} className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-200">{label}</label>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{pts} pts</span>
              </div>
              <input type="text" placeholder={placeholder} defaultValue={(globalBet as any)[field] ?? ''} onBlur={e => saveGlobalBet(field, e.target.value)} className="w-full border border-slate-700 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <p className="text-xs text-slate-500">Se guarda automáticamente al salir de cada campo</p>
        </div>
      )}
    </div>
  )
}
