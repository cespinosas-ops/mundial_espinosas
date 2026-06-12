'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
const STAGE_SHORT: Record<string, string> = {
  LAST_32: '16avos',
  LAST_16: 'Octavos',
  QUARTER_FINALS: 'Cuartos',
  SEMI_FINALS: 'Semis',
  THIRD_PLACE: '3er lugar',
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Mundial 2026 🏆</h1>
          <p className="text-sm text-slate-400 mt-1">Grupos, partidos, eliminatorias y goleadores en vivo</p>
        </div>

        <LiveBanner matches={matches} />

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-slate-500 py-12">Cargando datos del Mundial…</p>}
        {err && !loading && <p className="text-center text-amber-400 py-4 text-sm">{err}</p>}

        {!loading && tab === 'grupos' && <Grupos groups={groups} />}
        {!loading && tab === 'fixture' && <Fixture matches={matches} />}
        {!loading && tab === 'knockouts' && <Knockouts matches={matches} />}
        {!loading && tab === 'stats' && <Stats scorers={scorers} />}
      </main>
    </div>
  )
}

function Crest({ src, alt, big = false }: { src: string; alt: string; big?: boolean }) {
  const cls = big ? 'w-7 h-7' : 'w-5 h-5'
  if (!src) return <span className={`inline-block ${cls}`} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`${cls} object-contain inline-block`} />
}

// ---------- LIVE / PRÓXIMO ----------
function LiveBanner({ matches }: { matches: Match[] }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => tick(t => t + 1), 1000)
    return () => clearInterval(i)
  }, [])

  const live = matches.find(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const upcoming = matches
    .filter(m => m.status === 'TIMED' || m.status === 'SCHEDULED')
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0]

  if (live) {
    return (
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-600/20 to-slate-800 border border-red-500/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-red-400 text-xs font-bold tracking-wider uppercase">En vivo ahora</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-white font-semibold">{live.home}</span>
            <Crest src={live.homeCrest} alt={live.home} big />
          </div>
          <div className="text-2xl font-bold text-white px-3">{live.homeGoals}-{live.awayGoals}</div>
          <div className="flex items-center gap-2 flex-1">
            <Crest src={live.awayCrest} alt={live.away} big />
            <span className="text-white font-semibold">{live.away}</span>
          </div>
        </div>
      </div>
    )
  }

  if (upcoming) {
    const diff = new Date(upcoming.utcDate).getTime() - Date.now()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return (
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-slate-800 border border-purple-500/30 p-5">
        <div className="text-purple-300 text-xs font-bold tracking-wider uppercase mb-3">⏭ Próximo partido</div>
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-white font-semibold">{upcoming.home || 'Por definir'}</span>
            <Crest src={upcoming.homeCrest} alt={upcoming.home} big />
          </div>
          <span className="text-slate-500 font-bold px-2">vs</span>
          <div className="flex items-center gap-2 flex-1">
            <Crest src={upcoming.awayCrest} alt={upcoming.away} big />
            <span className="text-white font-semibold">{upcoming.away || 'Por definir'}</span>
          </div>
        </div>
        {diff > 0 && (
          <div className="text-center text-2xl font-mono font-bold text-purple-300">
            {h > 0 && `${h}h `}{String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
          </div>
        )}
      </div>
    )
  }
  return null
}

// ---------- GRUPOS ----------
function Grupos({ groups }: { groups: Group[] }) {
  if (!groups.length) return <p className="text-center text-slate-500 py-8">Aún no hay datos de grupos.</p>

  const thirds = groups
    .map(g => g.table.find(r => r.position === 3))
    .filter((r): r is Row => !!r)
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g.group} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 font-bold text-white text-sm">{g.group.replace('Group', 'Grupo')}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-3 py-2 font-medium">Equipo</th>
                  <th className="px-1 py-2 font-medium">PJ</th>
                  <th className="px-1 py-2 font-medium">DG</th>
                  <th className="px-3 py-2 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.table.map((r) => {
                  const qualifies = r.position <= 2
                  const isThird = r.position === 3
                  return (
                    <tr key={r.tla} className={`border-t border-slate-700/40 ${
                      qualifies ? 'bg-emerald-500/15' : isThird ? 'bg-amber-500/10' : ''
                    }`}>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className={`w-4 font-medium ${
                            qualifies ? 'text-emerald-400' : isThird ? 'text-amber-400' : 'text-slate-500'
                          }`}>{r.position}</span>
                          <Crest src={r.crest} alt={r.team} />
                          <span className="text-slate-100">{r.team}</span>
                        </span>
                      </td>
                      <td className="text-center text-slate-400">{r.played}</td>
                      <td className="text-center text-slate-400">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                      <td className="text-center font-bold text-white">{r.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>Clasifican (1° y 2°)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40"></span>3° (mejor tercero)</span>
      </div>

      {thirds.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="bg-slate-800 px-4 py-2.5 font-bold text-white text-sm flex items-center gap-2">
            🥉 Mejores terceros
            <span className="text-xs font-normal text-slate-400">(los 8 mejores avanzan)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs">
                <th className="text-left px-3 py-2 font-medium">Equipo</th>
                <th className="px-2 py-2 font-medium">PJ</th>
                <th className="px-2 py-2 font-medium">DG</th>
                <th className="px-2 py-2 font-medium">GF</th>
                <th className="px-3 py-2 font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {thirds.map((r, i) => (
                <tr key={r.tla} className={`border-t border-slate-700/40 ${i < 8 ? 'bg-emerald-500/10' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className={`w-4 ${i < 8 ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
                      <Crest src={r.crest} alt={r.team} />
                      <span className="text-slate-100">{r.team}</span>
                    </span>
                  </td>
                  <td className="text-center text-slate-400">{r.played}</td>
                  <td className="text-center text-slate-400">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="text-center text-slate-400">{r.gf}</td>
                  <td className="text-center font-bold text-white">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- MATCH ROW ----------
function MatchRow({ m }: { m: Match }) {
  const done = m.status === 'FINISHED'
  const live = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const href = m.home && m.away ? `/mundial/partido?home=${encodeURIComponent(m.home)}&away=${encodeURIComponent(m.away)}` : null
  const Row = (
    <div className={`flex items-center gap-3 px-4 py-4 text-sm border-t border-slate-700/40 first:border-t-0 ${live ? 'bg-red-500/5' : ''} ${href ? 'hover:bg-slate-800/80 cursor-pointer transition-colors' : ''}`}>
      <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
        <span className={done && (m.homeGoals ?? 0) > (m.awayGoals ?? 0) ? 'font-bold text-white' : 'text-slate-300'}>{m.home || 'Por definir'}</span>
        <Crest src={m.homeCrest} alt={m.home} />
      </div>
      <div className="min-w-[72px] text-center">
        {done || live ? (
          <span className={`font-bold text-base ${live ? 'text-red-400' : 'text-white'}`}>{m.homeGoals}-{m.awayGoals}</span>
        ) : (
          <span className="text-xs text-slate-500">{new Date(m.utcDate).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {live && <div className="text-[10px] text-red-400 font-bold tracking-wide">EN VIVO</div>}
      </div>
      <div className="flex-1 flex items-center gap-2.5">
        <Crest src={m.awayCrest} alt={m.away} />
        <span className={done && (m.awayGoals ?? 0) > (m.homeGoals ?? 0) ? 'font-bold text-white' : 'text-slate-300'}>{m.away || 'Por definir'}</span>
      </div>
    </div>
  )
  return href ? <Link href={href} className="block">{Row}</Link> : Row
}

// ---------- FIXTURE ----------
function Fixture({ matches }: { matches: Match[] }) {
  const byDay: Record<number, Match[]> = {}
  matches.filter(m => m.stage === 'GROUP_STAGE').forEach(m => {
    (byDay[m.matchday] ||= []).push(m)
  })
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b)
  const [active, setActive] = useState<number | null>(null)

  if (!days.length) return <p className="text-center text-slate-500 py-8">Sin partidos.</p>
  const current = active ?? days[0]

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {days.map(d => (
          <button key={d} onClick={() => setActive(d)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              current === d ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            Jornada {d}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {byDay[current].sort((a, b) => a.utcDate.localeCompare(b.utcDate)).map(m => <MatchRow key={m.id} m={m} />)}
      </div>
    </div>
  )
}

// ---------- KNOCKOUTS ----------
function Knockouts({ matches }: { matches: Match[] }) {
  const ko = matches.filter(m => m.stage !== 'GROUP_STAGE')
  const byStage: Record<string, Match[]> = {}
  ko.forEach(m => { (byStage[m.stage] ||= []).push(m) })
  const stages = KO_ORDER.filter(s => byStage[s])
  const [active, setActive] = useState<string | null>(null)

  if (!stages.length) return <p className="text-center text-slate-500 py-8">Las eliminatorias empiezan después de la fase de grupos.</p>
  const current = active ?? stages[0]

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {stages.map(s => (
          <button key={s} onClick={() => setActive(s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              current === s ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {STAGE_SHORT[s] || s}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="bg-slate-800 px-4 py-2.5 font-bold text-white text-sm">{STAGE_LABELS[current] || current}</div>
        {byStage[current].sort((a, b) => a.utcDate.localeCompare(b.utcDate)).map(m => <MatchRow key={m.id} m={m} />)}
      </div>
    </div>
  )
}

// ---------- STATS ----------
function Stats({ scorers }: { scorers: Scorer[] }) {
  if (!scorers.length) return <p className="text-center text-slate-500 py-8">Aún no hay goleadores registrados.</p>
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="bg-slate-800 px-4 py-2.5 font-bold text-white text-sm">⚽ Tabla de goleadores</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs">
            <th className="text-left px-4 py-2 font-medium">Jugador</th>
            <th className="px-2 py-2 font-medium">PJ</th>
            <th className="px-4 py-2 font-medium">Goles</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr key={i} className="border-t border-slate-700/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-5 font-bold ${i === 0 ? 'text-amber-400' : 'text-slate-500'}`}>{i + 1}</span>
                  <Crest src={s.crest} alt={s.team} />
                  <div>
                    <div className="text-slate-100 font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.team}</div>
                  </div>
                </div>
              </td>
              <td className="text-center text-slate-400">{s.played}</td>
              <td className="text-center font-bold text-white text-base">{s.goals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
