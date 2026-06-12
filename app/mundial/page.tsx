'use client'
import { useEffect, useState } from 'react'

type Tab = 'grupos' | 'fixture' | 'knockouts' | 'stats'

type Row = {
  position: number; team: string; tla: string; crest: string
  played: number; won: number; draw: number; lost: number
  gf: number; ga: number; gd: number; points: number
}
type Group = { group: string; table: Row[] }
type Scorer = {
  name: string; nationality: string; team: string; crest: string
  goals: number; assists: number; penalties: number; played: number
}
type Match = {
  id: number; utcDate: string; status: string; matchday: number
  stage: string; group: string | null
  home: string; homeTla: string; homeCrest: string
  away: string; awayTla: string; awayCrest: string
  homeGoals: number | null; awayGoals: number | null
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de grupos',
  LAST_32: 'Dieciseisavos',
  LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final',
  SEMI_FINALS: 'Semifinales',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: 'Final',
}
const KO_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

export default function MundialPage() {
  const [tab, setTab] = useState<Tab>('grupos')
  const [groups, setGroups] = useState<Group[]>([])
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/mundial?type=standings').then(r => r.json()),
      fetch('/api/mundial?type=scorers').then(r => r.json()),
      fetch('/api/mundial?type=matches').then(r => r.json()),
    ]).then(([g, s, m]) => {
      if (g.groups) setGroups(g.groups)
      if (s.scorers) setScorers(s.scorers)
      if (m.matches) setMatches(m.matches)
      if (g.error || s.error || m.error) setErr('No se pudieron cargar algunos datos del Mundial.')
      setLoading(false)
    }).catch(() => { setErr('Error al cargar datos del Mundial.'); setLoading(false) })
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'grupos', label: '📊 Grupos' },
    { id: 'fixture', label: '📅 Fixture' },
    { id: 'knockouts', label: '🏆 Eliminatorias' },
    { id: 'stats', label: '⚽ Goleadores' },
  ]

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mundial 2026</h1>
        <p className="text-sm text-gray-500">Grupos, partidos, eliminatorias y goleadores en vivo</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-gray-400 py-12">Cargando datos del Mundial…</p>}
      {err && !loading && <p className="text-center text-amber-600 py-4 text-sm">{err}</p>}

      {!loading && tab === 'grupos' && <Grupos groups={groups} />}
      {!loading && tab === 'fixture' && <Fixture matches={matches} />}
      {!loading && tab === 'knockouts' && <Knockouts matches={matches} />}
      {!loading && tab === 'stats' && <Stats scorers={scorers} />}
    </main>
  )
}

function Crest({ src, alt }: { src: string; alt: string }) {
  if (!src) return <span className="inline-block w-5 h-5" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-5 h-5 object-contain inline-block" />
}

function Grupos({ groups }: { groups: Group[] }) {
  if (!groups.length) return <p className="text-center text-gray-400 py-8">Aún no hay datos de grupos.</p>
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {groups.map(g => (
        <div key={g.group} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-800 text-sm">{g.group.replace('Group', 'Grupo')}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs">
                <th className="text-left px-3 py-2 font-medium">Equipo</th>
                <th className="px-1 py-2 font-medium">PJ</th>
                <th className="px-1 py-2 font-medium">DG</th>
                <th className="px-2 py-2 font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.table.map((r, i) => (
                <tr key={r.tla} className={`border-t border-gray-100 ${i < 2 ? 'bg-green-50/50' : ''}`}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400 w-4">{r.position}</span>
                      <Crest src={r.crest} alt={r.team} />
                      <span className="text-gray-800">{r.team}</span>
                    </span>
                  </td>
                  <td className="text-center text-gray-500">{r.played}</td>
                  <td className="text-center text-gray-500">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="text-center font-semibold text-gray-900">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-xs text-gray-400 sm:col-span-2">Los 2 primeros de cada grupo (verde) avanzan, más los mejores terceros.</p>
    </div>
  )
}

function MatchRow({ m }: { m: Match }) {
  const done = m.status === 'FINISHED'
  const live = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 text-sm border-t border-gray-100 first:border-t-0">
      <div className="flex-1 flex items-center justify-end gap-2 text-right">
        <span className={done && (m.homeGoals ?? 0) > (m.awayGoals ?? 0) ? 'font-semibold text-gray-900' : 'text-gray-700'}>{m.home || 'Por definir'}</span>
        <Crest src={m.homeCrest} alt={m.home} />
      </div>
      <div className="min-w-[60px] text-center">
        {done || live ? (
          <span className={`font-bold ${live ? 'text-red-600' : 'text-gray-900'}`}>{m.homeGoals}-{m.awayGoals}</span>
        ) : (
          <span className="text-xs text-gray-400">{new Date(m.utcDate).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {live && <div className="text-[10px] text-red-500 font-medium">EN VIVO</div>}
      </div>
      <div className="flex-1 flex items-center gap-2">
        <Crest src={m.awayCrest} alt={m.away} />
        <span className={done && (m.awayGoals ?? 0) > (m.homeGoals ?? 0) ? 'font-semibold text-gray-900' : 'text-gray-700'}>{m.away || 'Por definir'}</span>
      </div>
    </div>
  )
}

function Fixture({ matches }: { matches: Match[] }) {
  const byDay: Record<number, Match[]> = {}
  matches.filter(m => m.stage === 'GROUP_STAGE').forEach(m => {
    (byDay[m.matchday] ||= []).push(m)
  })
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b)
  if (!days.length) return <p className="text-center text-gray-400 py-8">Sin partidos.</p>
  return (
    <div className="space-y-5">
      {days.map(d => (
        <div key={d} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-800 text-sm">Jornada {d}</div>
          {byDay[d].sort((a, b) => a.utcDate.localeCompare(b.utcDate)).map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      ))}
    </div>
  )
}

function Knockouts({ matches }: { matches: Match[] }) {
  const ko = matches.filter(m => m.stage !== 'GROUP_STAGE')
  const byStage: Record<string, Match[]> = {}
  ko.forEach(m => { (byStage[m.stage] ||= []).push(m) })
  const stages = KO_ORDER.filter(s => byStage[s])
  if (!stages.length) return <p className="text-center text-gray-400 py-8">Las eliminatorias empiezan después de la fase de grupos.</p>
  return (
    <div className="space-y-5">
      {stages.map(s => (
        <div key={s} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-800 text-sm">{STAGE_LABELS[s] || s}</div>
          {byStage[s].sort((a, b) => a.utcDate.localeCompare(b.utcDate)).map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      ))}
    </div>
  )
}

function Stats({ scorers }: { scorers: Scorer[] }) {
  if (!scorers.length) return <p className="text-center text-gray-400 py-8">Aún no hay goleadores registrados.</p>
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-800 text-sm">Tabla de goleadores</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs">
            <th className="text-left px-4 py-2 font-medium">Jugador</th>
            <th className="px-2 py-2 font-medium">PJ</th>
            <th className="px-3 py-2 font-medium">Goles</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5">{i + 1}</span>
                  <Crest src={s.crest} alt={s.team} />
                  <div>
                    <div className="text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.team}</div>
                  </div>
                </div>
              </td>
              <td className="text-center text-gray-500">{s.played}</td>
              <td className="text-center font-bold text-gray-900">{s.goals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
