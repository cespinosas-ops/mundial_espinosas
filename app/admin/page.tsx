'use client'
import { useEffect, useState } from 'react'
import { supabase, Player, Match, Config, GlobalBet } from '@/lib/supabase'
import { determineUnderdog, calculateMatchPoints } from '@/lib/fifa'

type Tab = 'jugadores' | 'partidos' | 'config' | 'resultados' | 'globales'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('jugadores')
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [config, setConfig] = useState<Config>({
    id: 1, champion_pts: 20, scorer_pts: 15, keeper_pts: 10, mvp_pts: 10,
    exact_score_pts: 5, winner_only_pts: 2, draw_exact_pts: 5, draw_only_pts: 2,
    ud_exact_score_pts: 10, ud_winner_only_pts: 5, ud_draw_exact_pts: 8, ud_draw_only_pts: 4,
  })
  const [newPlayer, setNewPlayer] = useState({ name: '', emoji: '' })
  const [newMatch, setNewMatch] = useState({ home: '', away: '', phase: 'Grupos', match_date: '' })
  const [underdogPreview, setUnderdogPreview] = useState<{ underdog: string | null; homeRanking: number | null; awayRanking: number | null } | null>(null)
  const [cfgSaved, setCfgSaved] = useState(false)
  const [globalResults, setGlobalResults] = useState({ champion: '', scorer: '', keeper: '', mvp: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: pl }, { data: m }, { data: cfg }] = await Promise.all([
      supabase.from('players').select('*').order('created_at'),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('config').select('*').eq('id', 1),
    ])
    setPlayers(pl ?? [])
    setMatches(m ?? [])
    if (cfg?.[0]) setConfig(cfg[0])
  }

  async function addPlayer() {
    if (!newPlayer.name.trim()) return
    await supabase.from('players').insert({ name: newPlayer.name.trim(), emoji: newPlayer.emoji || '👤' })
    setNewPlayer({ name: '', emoji: '' })
    load()
  }

  async function removePlayer(id: string) {
    if (!confirm('¿Eliminar jugador y todas sus predicciones?')) return
    await supabase.from('players').delete().eq('id', id)
    load()
  }

  function previewUnderdog() {
    if (!newMatch.home || !newMatch.away) { setUnderdogPreview(null); return }
    const r = determineUnderdog(newMatch.home, newMatch.away)
    setUnderdogPreview({
      underdog: r.underdog ? (r.underdog === 'home' ? newMatch.home : newMatch.away) : null,
      homeRanking: r.homeRanking,
      awayRanking: r.awayRanking,
    })
  }

  async function addMatch() {
    if (!newMatch.home || !newMatch.away) return
    const { underdog, homeRanking, awayRanking } = determineUnderdog(newMatch.home, newMatch.away)
    await supabase.from('matches').insert({
      home: newMatch.home, away: newMatch.away, phase: newMatch.phase,
      match_date: newMatch.match_date || null,
      home_ranking: homeRanking, away_ranking: awayRanking,
      underdog: underdog ?? null,
    })
    setNewMatch({ home: '', away: '', phase: 'Grupos', match_date: '' })
    setUnderdogPreview(null)
    load()
  }

  async function removeMatch(id: string) {
    if (!confirm('¿Eliminar partido y todas sus predicciones?')) return
    await supabase.from('matches').delete().eq('id', id)
    load()
  }

  async function saveResult(matchId: string, homeGoals: number, awayGoals: number) {
    const match = matches.find(m => m.id === matchId)!
    await supabase.from('matches').update({ result_home: homeGoals, result_away: awayGoals }).eq('id', matchId)

    // Recalculate points for all predictions of this match
    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', matchId)
    if (preds) {
      for (const pred of preds) {
        const pts = calculateMatchPoints(
          { picked_team: pred.picked_team, home_goals: pred.home_goals, away_goals: pred.away_goals },
          { home: homeGoals, away: awayGoals },
          match.underdog as any,
          { exact_score_pts: config.exact_score_pts, winner_only_pts: config.winner_only_pts, draw_exact_pts: config.draw_exact_pts, draw_only_pts: config.draw_only_pts, ud_exact_score_pts: config.ud_exact_score_pts, ud_winner_only_pts: config.ud_winner_only_pts, ud_draw_exact_pts: config.ud_draw_exact_pts, ud_draw_only_pts: config.ud_draw_only_pts }
        )
        await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
      }
    }
    load()
  }

  async function saveConfig() {
    await supabase.from('config').upsert(config)
    setCfgSaved(true)
    setTimeout(() => setCfgSaved(false), 2000)
  }

  async function resolveGlobalBets() {
    const { data: allBets } = await supabase.from('global_bets').select('*')
    if (!allBets) return
    for (const bet of allBets) {
      let pts = 0
      if (globalResults.champion && bet.champion?.toLowerCase() === globalResults.champion.toLowerCase()) pts += config.champion_pts
      if (globalResults.scorer && bet.scorer?.toLowerCase() === globalResults.scorer.toLowerCase()) pts += config.scorer_pts
      if (globalResults.keeper && bet.keeper?.toLowerCase() === globalResults.keeper.toLowerCase()) pts += config.keeper_pts
      if (globalResults.mvp && bet.mvp?.toLowerCase() === globalResults.mvp.toLowerCase()) pts += config.mvp_pts
      await supabase.from('global_bets').update({ points_earned: pts }).eq('id', bet.id)
    }
    alert('✓ Puntos globales calculados')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'jugadores', label: 'Jugadores' },
    { id: 'partidos', label: 'Partidos' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'globales', label: 'Apuestas globales' },
    { id: 'config', label: 'Puntos' },
  ]

  const ResultInput = ({ match }: { match: Match }) => {
    const [h, setH] = useState(match.result_home?.toString() ?? '')
    const [a, setA] = useState(match.result_away?.toString() ?? '')
    return (
      <div className="flex items-center gap-2 mt-2">
        <input type="number" min="0" value={h} onChange={e => setH(e.target.value)}
          className="w-12 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
        <span className="text-gray-400">-</span>
        <input type="number" min="0" value={a} onChange={e => setA(e.target.value)}
          className="w-12 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
        <button onClick={() => saveResult(match.id, parseInt(h) || 0, parseInt(a) || 0)}
          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
          Guardar
        </button>
      </div>
    )
  }

  const CfgRow = ({ label, field }: { label: string; field: keyof Config }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <input type="number" min="0"
        value={config[field] as number}
        onChange={e => setConfig(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
        className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center font-medium text-purple-700" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-900">Admin</h1>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Panel de administrador</span>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* JUGADORES */}
      {tab === 'jugadores' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar jugador</h3>
            <div className="flex gap-3">
              <input placeholder="Nombre" value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" onKeyDown={e => e.key === 'Enter' && addPlayer()} />
              <input placeholder="🦁" value={newPlayer.emoji} onChange={e => setNewPlayer(p => ({ ...p, emoji: e.target.value }))}
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" maxLength={2} />
              <button onClick={addPlayer} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Agregar</button>
            </div>
          </div>
          <div className="space-y-2">
            {players.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Sin jugadores</div>}
            {players.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="text-xl">{p.emoji}</span><span className="font-medium text-sm">{p.name}</span></div>
                <button onClick={() => removePlayer(p.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARTIDOS */}
      {tab === 'partidos' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar partido</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="text-xs text-gray-500 block mb-1">Equipo local</label>
                <input placeholder="Ej: México" value={newMatch.home}
                  onChange={e => { setNewMatch(p => ({ ...p, home: e.target.value })); setUnderdogPreview(null) }}
                  onBlur={previewUnderdog}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Equipo visita</label>
                <input placeholder="Ej: Sudáfrica" value={newMatch.away}
                  onChange={e => { setNewMatch(p => ({ ...p, away: e.target.value })); setUnderdogPreview(null) }}
                  onBlur={previewUnderdog}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Fase</label>
                <select value={newMatch.phase} onChange={e => setNewMatch(p => ({ ...p, phase: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {['Grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer puesto', 'Final'].map(f => <option key={f}>{f}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-500 block mb-1">Fecha y hora</label>
                <input type="datetime-local" value={newMatch.match_date} onChange={e => setNewMatch(p => ({ ...p, match_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            {underdogPreview && (
              <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
                {underdogPreview.homeRanking && underdogPreview.awayRanking ? (
                  <>
                    {newMatch.home} #{underdogPreview.homeRanking} FIFA · {newMatch.away} #{underdogPreview.awayRanking} FIFA
                    {underdogPreview.underdog ? <> · <strong>No favorito: {underdogPreview.underdog}</strong></> : <> · Sin datos para determinar favorito</>}
                  </>
                ) : (
                  <span>⚠️ No se encontró alguno de los equipos en el ranking FIFA — el no favorito quedará sin definir</span>
                )}
              </div>
            )}
            <button onClick={addMatch} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Agregar partido</button>
          </div>
          <div className="space-y-2">
            {matches.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Sin partidos</div>}
            {matches.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{m.phase}</span>
                    <span className="text-sm font-medium">{m.home} vs {m.away}</span>
                    {m.underdog && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">No fav: {m.underdog === 'home' ? m.home : m.away}</span>}
                    {m.result_home !== null && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{m.result_home}-{m.result_away}</span>}
                  </div>
                  {m.match_date && <div className="text-xs text-gray-400 mt-0.5">{new Date(m.match_date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
                <button onClick={() => removeMatch(m.id)} className="text-xs text-red-500 hover:text-red-700 ml-4">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTADOS */}
      {tab === 'resultados' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Ingresa el resultado real de cada partido para que el sistema calcule los puntos automáticamente.</p>
          <div className="space-y-3">
            {matches.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Sin partidos cargados</div>}
            {matches.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{m.phase}</span>
                  <span className="text-sm font-medium text-gray-900">{m.home} vs {m.away}</span>
                  {m.result_home !== null && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ {m.result_home}-{m.result_away}</span>}
                </div>
                <ResultInput match={m} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APUESTAS GLOBALES */}
      {tab === 'globales' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Resolver apuestas globales</h3>
            <p className="text-xs text-gray-500 mb-4">Ingresa los ganadores reales al final del mundial. El sistema compara con las apuestas de cada jugador.</p>
            {[
              { field: 'champion', label: '🏆 Campeón del mundo' },
              { field: 'scorer', label: '⚽ Goleador del torneo' },
              { field: 'keeper', label: '🧤 Mejor arquero' },
              { field: 'mvp', label: '🌟 Balón de Oro' },
            ].map(({ field, label }) => (
              <div key={field} className="mb-4">
                <label className="text-sm text-gray-700 block mb-1">{label}</label>
                <input type="text" placeholder="Nombre real del ganador"
                  value={(globalResults as any)[field]}
                  onChange={e => setGlobalResults(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <button onClick={resolveGlobalBets} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
              Calcular puntos globales
            </button>
          </div>
        </div>
      )}

      {/* CONFIG */}
      {tab === 'config' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Apuestas globales</h3>
            <CfgRow label="🏆 Campeón acertado" field="champion_pts" />
            <CfgRow label="⚽ Goleador acertado" field="scorer_pts" />
            <CfgRow label="🧤 Mejor arquero acertado" field="keeper_pts" />
            <CfgRow label="🌟 Balón de Oro acertado" field="mvp_pts" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Partido — apostando al favorito</h3>
            <CfgRow label="Marcador exacto" field="exact_score_pts" />
            <CfgRow label="Ganador correcto (sin marcador)" field="winner_only_pts" />
            <CfgRow label="Empate con marcador exacto" field="draw_exact_pts" />
            <CfgRow label="Empate correcto (sin marcador)" field="draw_only_pts" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Partido — apostando al no favorito ⚡</h3>
            <p className="text-xs text-gray-400 mb-3">Puntos que se ganan si apostás al equipo con peor ranking FIFA y acertás</p>
            <CfgRow label="Marcador exacto del no favorito" field="ud_exact_score_pts" />
            <CfgRow label="Victoria del no favorito (sin marcador)" field="ud_winner_only_pts" />
            <CfgRow label="Empate exacto (no favorito)" field="ud_draw_exact_pts" />
            <CfgRow label="Empate correcto (no favorito)" field="ud_draw_only_pts" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveConfig} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Guardar configuración</button>
            {cfgSaved && <span className="text-sm text-green-600">✓ Guardado</span>}
          </div>
        </div>
      )}
    </div>
  )
}
