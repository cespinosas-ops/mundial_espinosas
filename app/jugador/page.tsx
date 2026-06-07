'use client'
// v2 session isolated
import { useEffect, useState } from 'react'
import { supabase, Player, Match, Prediction, GlobalBet, Config } from '@/lib/supabase'

export default function JugadorPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [globalBet, setGlobalBet] = useState<Partial<GlobalBet>>({})
  const [config, setConfig] = useState<Config | null>(null)
  const [tab, setTab] = useState<'partidos' | 'global'>('partidos')

  useEffect(() => { loadBase() }, [])
  useEffect(() => { if (selectedPlayer) loadPlayerData() }, [selectedPlayer])

  async function loadBase() {
    const [{ data: pl }, { data: m }, { data: cfg }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('config').select('*').eq('id', 1),
    ])
    setPlayers(pl ?? [])
    setMatches(m ?? [])
    setConfig(cfg?.[0] ?? null)
  }

  async function loadPlayerData() {
    const [{ data: preds }, { data: gb }] = await Promise.all([
      supabase.from('predictions').select('*').eq('player_id', selectedPlayer),
      supabase.from('global_bets').select('*').eq('player_id', selectedPlayer).maybeSingle(),
    ])
    const predMap: Record<string, Prediction> = {}
    preds?.forEach(p => { predMap[p.match_id] = p })
    setPredictions(predMap)
    setGlobalBet(gb ?? {})
  }

  async function savePrediction(matchId: string, field: string, value: string | number | null) {
    if (!selectedPlayer) return
    const existing = predictions[matchId]
    const updated = { ...existing, player_id: selectedPlayer, match_id: matchId, [field]: value }
    const { data, error } = await supabase
      .from('predictions')
      .upsert({ ...updated, points_earned: 0 }, { onConflict: 'player_id,match_id' })
      .select()
      .single()
    if (!error && data) setPredictions(prev => ({ ...prev, [matchId]: data }))
  }

  async function saveGlobalBet(field: string, value: string) {
    if (!selectedPlayer) return
    const updated = { ...globalBet, player_id: selectedPlayer, [field]: value }
    const { data } = await supabase
      .from('global_bets')
      .upsert({ ...updated, points_earned: 0 }, { onConflict: 'player_id' })
      .select()
      .single()
    if (data) setGlobalBet(data)
  }

  // Favorito = mejor ranking FIFA (número más bajo)
  function getFavorite(m: Match): 'home' | 'away' | null {
    if (!m.home_ranking || !m.away_ranking) return null
    return m.home_ranking < m.away_ranking ? 'home' : 'away'
  }

  function getFavoriteTeam(m: Match): string | null {
    const fav = getFavorite(m)
    if (!fav) return null
    return fav === 'home' ? m.home : m.away
  }

  function getUnderdogTeam(m: Match): string | null {
    const fav = getFavorite(m)
    if (!fav) return null
    return fav === 'home' ? m.away : m.home
  }

  const pendingMatches = matches.filter(m => m.result_home === null)
  const playedMatches = matches.filter(m => m.result_home !== null)

  return (
    <div>
      <h1 className="text-2xl font-medium text-gray-900 mb-6">Mis apuestas</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <label className="text-sm text-gray-500 block mb-2">Selecciona tu nombre</label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          value={selectedPlayer}
          onChange={e => setSelectedPlayer(e.target.value)}
        >
          <option value="">— Elige un jugador —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
      </div>

      {!selectedPlayer && (
        <div className="text-center py-12 text-gray-400 text-sm">Selecciona tu nombre para ver tus apuestas</div>
      )}

      {selectedPlayer && (
        <>
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            <button onClick={() => setTab('partidos')}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === 'partidos' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500'}`}>
              Partidos ({pendingMatches.length} pendientes)
            </button>
            <button onClick={() => setTab('global')}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === 'global' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500'}`}>
              Apuestas globales
            </button>
          </div>

          {tab === 'partidos' && (
            <div>
              {pendingMatches.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No hay partidos pendientes</div>
              )}
              <div className="space-y-4">
                {pendingMatches.map(m => {
                  const pred = predictions[m.id] ?? {}
                  const favTeam = getFavoriteTeam(m)
                  const udTeam = getUnderdogTeam(m)
                  const homeIsFav = m.home_ranking && m.away_ranking && m.home_ranking < m.away_ranking
                  const awayIsFav = m.home_ranking && m.away_ranking && m.away_ranking < m.home_ranking

                  return (
                    <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{m.phase}</span>
                        {m.match_date && (
                          <span className="text-xs text-gray-400">
                            {new Date(m.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Equipos con rankings */}
                      <div className="grid grid-cols-3 gap-2 items-center mb-4">
                        <div className="text-center">
                          <div className="font-semibold text-sm text-gray-900 mb-1">{m.home}</div>
                          {m.home_ranking && (
                            <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${homeIsFav ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              #{m.home_ranking} FIFA {homeIsFav ? '⭐ Favorito' : '⚡ No fav'}
                            </div>
                          )}
                        </div>
                        <div className="text-center text-gray-300 font-medium text-sm">vs</div>
                        <div className="text-center">
                          <div className="font-semibold text-sm text-gray-900 mb-1">{m.away}</div>
                          {m.away_ranking && (
                            <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${awayIsFav ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              #{m.away_ranking} FIFA {awayIsFav ? '⭐ Favorito' : '⚡ No fav'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bonus info */}
                      {udTeam && (
                        <div className="text-xs bg-amber-50 border border-amber-100 text-amber-700 rounded-lg px-3 py-2 mb-4">
                          ⚡ Si apostás a <strong>{udTeam}</strong> y acertás, ganás puntos extra por ser el no favorito
                        </div>
                      )}

                      {/* Selección ganador */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2 font-medium">¿Quién gana?</div>
                        <div className="flex gap-2">
                          {(['home', 'draw', 'away'] as const).map(opt => {
                            const label = opt === 'home' ? m.home : opt === 'away' ? m.away : 'Empate'
                            const isUd = (opt === 'home' && !homeIsFav) || (opt === 'away' && !awayIsFav)
                            return (
                              <button key={opt}
                                onClick={() => savePrediction(m.id, 'picked_team', pred.picked_team === opt ? null : opt)}
                                className={`flex-1 text-xs py-2.5 px-1 rounded-lg border transition-all ${
                                  pred.picked_team === opt
                                    ? 'bg-purple-600 text-white border-purple-600 font-medium'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                }`}>
                                {label}{opt !== 'draw' && isUd ? ' ⚡' : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Marcador exacto */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2 font-medium">Marcador exacto</div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">{m.home}</div>
                            <input type="number" min="0" max="20"
                              placeholder="0"
                              defaultValue={pred.home_goals ?? ''}
                              onBlur={e => savePrediction(m.id, 'home_goals', e.target.value !== '' ? parseInt(e.target.value) : null)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-medium" />
                          </div>
                          <span className="text-gray-300 text-lg mt-4">-</span>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">{m.away}</div>
                            <input type="number" min="0" max="20"
                              placeholder="0"
                              defaultValue={pred.away_goals ?? ''}
                              onBlur={e => savePrediction(m.id, 'away_goals', e.target.value !== '' ? parseInt(e.target.value) : null)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-medium" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Partidos jugados */}
              {playedMatches.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Partidos jugados</h2>
                  <div className="space-y-3">
                    {playedMatches.map(m => {
                      const pred = predictions[m.id]
                      const pts = pred?.points_earned ?? 0
                      return (
                        <div key={m.id} className={`bg-white rounded-xl border p-4 ${pts > 0 ? 'border-green-100' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{m.home} vs {m.away}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Resultado: <strong>{m.result_home} - {m.result_away}</strong> ·{' '}
                                {pred
                                  ? `${pred.picked_team === 'home' ? m.home : pred.picked_team === 'away' ? m.away : 'Empate'}${pred.home_goals !== null ? ` (${pred.home_goals}-${pred.away_goals})` : ''}`
                                  : 'Sin predicción'}
                              </div>
                            </div>
                            <div className={`font-bold text-xl ${pts > 0 ? 'text-green-600' : 'text-gray-200'}`}>
                              +{pts}
                            </div>
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
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <p className="text-sm text-gray-500 mb-6">Estas apuestas se hacen antes del mundial y se resuelven al final. Una sola apuesta por categoría.</p>
              {[
                { field: 'champion', label: '🏆 Campeón del mundo', placeholder: 'Ej: Argentina', pts: config?.champion_pts ?? 20 },
                { field: 'scorer', label: '⚽ Goleador del torneo', placeholder: 'Ej: Mbappé', pts: config?.scorer_pts ?? 15 },
                { field: 'keeper', label: '🧤 Mejor arquero', placeholder: 'Ej: Courtois', pts: config?.keeper_pts ?? 10 },
                { field: 'mvp', label: '🌟 Balón de Oro', placeholder: 'Ej: Messi', pts: config?.mvp_pts ?? 10 },
              ].map(({ field, label, placeholder, pts }) => (
                <div key={field} className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{pts} pts</span>
                  </div>
                  <input
                    type="text"
                    placeholder={placeholder}
                    defaultValue={(globalBet as any)[field] ?? ''}
                    onBlur={e => saveGlobalBet(field, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">Se guarda automáticamente al salir de cada campo</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
