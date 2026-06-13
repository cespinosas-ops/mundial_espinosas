'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type P = {
  name: string; number: string; position: string; rating: number | null
  goals: number; yellow: boolean; red: boolean; subIn: number | null; subOut: number | null
  playerId: number | null; replacedBy: number | null; replaces: number | null
}
type Form = { form: string; gf: number; gc: number; avgXg: number; avgXgC: number }
type Detail = {
  id: number; home: string; away: string; date: string; status: string; minute: number | null
  homeScore: number | null; awayScore: number | null
  homeXg: number | null; awayXg: number | null
  venue: string | null; referee: string | null; attendance: number | null
  odds: { home: number | null; draw: number | null; away: number | null; over25: number | null; btts: number | null }
  homeCoach: string | null; awayCoach: string | null
  homeForm: Form | null; awayForm: Form | null
  unavailable: any
  lineups: { home: { players: P[]; substitutes: P[]; formation: string | null }; away: { players: P[]; substitutes: P[]; formation: string | null } } | null
  liveStats: { label: string; home: number | null; away: number | null; pct: boolean }[] | null
  minutePlayed: number | null
}

function ratingColor(r: number | null) {
  if (r == null) return 'bg-slate-700 text-slate-200'
  if (r >= 7.5) return 'bg-emerald-500 text-white'
  if (r >= 6.5) return 'bg-lime-600 text-white'
  if (r >= 5.5) return 'bg-amber-500 text-white'
  return 'bg-red-500 text-white'
}

function FormBadges({ form }: { form: string }) {
  return (
    <span className="inline-flex gap-1">
      {form.split('').map((c, i) => (
        <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
          c === 'W' ? 'bg-emerald-500 text-white' : c === 'D' ? 'bg-slate-500 text-white' : 'bg-red-500 text-white'
        }`}>{c === 'W' ? 'G' : c === 'D' ? 'E' : 'P'}</span>
      ))}
    </span>
  )
}

function PlayerDot({ p }: { p: P }) {
  return (
    <div className="flex flex-col items-center w-14 sm:w-16">
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-slate-900/90 border border-slate-500/60 flex items-center justify-center text-[11px] font-bold text-white shadow">
          {p.number}
        </div>
        {p.rating != null && (
          <span className={`absolute -top-1.5 -right-2.5 rounded px-1 text-[9px] font-bold ${ratingColor(p.rating)}`}>{p.rating}</span>
        )}
        {(p.goals > 0 || p.yellow || p.red) && (
          <span className="absolute -bottom-1 -right-1.5 text-[10px]">
            {p.goals > 0 ? '⚽' : ''}{p.yellow ? '🟨' : ''}{p.red ? '🟥' : ''}
          </span>
        )}
      </div>
      <div className="text-[10px] text-white mt-1 text-center leading-tight w-full truncate" title={p.name}>{p.name}</div>
      {p.subOut != null && <div className="text-[9px] text-red-300">↓ {p.subOut}&apos;</div>}
    </div>
  )
}

// Construye filas según la formación (ej "4-1-4-1") respetando el orden de la API
function buildRows(players: P[], formation: string | null): P[][] {
  const starters = players.filter(p => p.subIn == null)
  const gk = starters.find(p => p.position === 'G')
  const field = starters.filter(p => p !== gk)
  const nums = (formation || '').split('-').map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0)
  const rows: P[][] = []
  if (gk) rows.push([gk])
  const total = nums.reduce((a, b) => a + b, 0)
  if (nums.length && total === field.length) {
    let idx = 0
    for (const n of nums) { rows.push(field.slice(idx, idx + n)); idx += n }
  } else {
    const order = ['D', 'M', 'F']
    for (const pos of order) {
      const grp = field.filter(p => p.position === pos)
      if (grp.length) rows.push(grp)
    }
  }
  return rows
}

function Pitch({ d }: { d: NonNullable<Detail['lineups']> & { homeName: string; awayName: string } }) {
  const homeRows = buildRows(d.home.players, d.home.formation)
  const awayRows = buildRows(d.away.players, d.away.formation).reverse()

  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-800/40">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5">
        <span className="font-bold text-white text-sm">{d.homeName}</span>
        {d.home.formation && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{d.home.formation}</span>}
      </div>
      <div className="bg-gradient-to-b from-emerald-900/60 via-emerald-950/50 to-emerald-900/60 px-2 py-5 space-y-5">
        {homeRows.map((row, i) => (
          <div key={'h' + i} className="flex justify-evenly">{row.map((p, j) => <PlayerDot key={j} p={p} />)}</div>
        ))}
        <div className="border-t border-dashed border-white/15 relative my-1">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10"></div>
        </div>
        {awayRows.map((row, i) => (
          <div key={'a' + i} className="flex justify-evenly">{row.map((p, j) => <PlayerDot key={j} p={p} />)}</div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5">
        <span className="font-bold text-white text-sm">{d.awayName}</span>
        {d.away.formation && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{d.away.formation}</span>}
      </div>
    </div>
  )
}

function MiniPlayer({ p, dir }: { p: P; dir: 'in' | 'out' }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={dir === 'in' ? 'text-emerald-400' : 'text-red-400'}>{dir === 'in' ? '▲' : '▼'}</span>
      <span className="text-slate-500 font-mono text-[10px]">{p.number}</span>
      <span className="text-slate-200">{p.name}</span>
      {p.goals > 0 && <span>{'⚽'.repeat(p.goals)}</span>}
      {p.yellow && <span>🟨</span>}
      {p.red && <span>🟥</span>}
      {p.rating != null && <span className={`rounded px-1 text-[9px] font-bold ${ratingColor(p.rating)}`}>{p.rating}</span>}
    </span>
  )
}

function TeamBench({ team, starters, subs, align }: { team: string; starters: P[]; subs: P[]; align: 'left' | 'right' }) {
  const outs = starters.filter(p => p.subOut != null)
  const ins = subs.filter(p => p.subIn != null)
  const pairs = outs.map(out => {
    const inP = ins.find(i => i.playerId === out.replacedBy) || ins.find(i => i.replaces === out.playerId)
    return { out, in: inP, minute: out.subOut }
  }).sort((a, b) => (a.minute || 0) - (b.minute || 0))
  const usedIn = new Set(pairs.map(p => p.in?.playerId).filter(Boolean))
  const benchOnly = subs.filter(p => p.subIn == null && !usedIn.has(p.playerId))

  const ta = align === 'right' ? 'text-right' : 'text-left'

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
      <div className={`text-sm font-bold text-white mb-3 ${ta}`}>{team}</div>

      {pairs.length > 0 && (
        <div className="mb-4">
          <div className={`text-[10px] text-slate-500 uppercase tracking-wider mb-2 ${ta}`}>Cambios</div>
          <div className="space-y-2">
            {pairs.map((pr, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
                <span className="text-slate-400 font-mono shrink-0">{pr.minute}&apos;</span>
                <div className={`flex flex-col gap-0.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
                  {pr.in && <MiniPlayer p={pr.in} dir="in" />}
                  <MiniPlayer p={pr.out} dir="out" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {benchOnly.length > 0 && (
        <div>
          <div className={`text-[10px] text-slate-500 uppercase tracking-wider mb-2 ${ta}`}>Banca</div>
          <div className={`flex flex-wrap gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
            {benchOnly.map((p, i) => (
              <span key={i} className="text-[11px] text-slate-400">
                <span className="font-mono text-slate-600">{p.number}</span> {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBar({ label, home, away, pct }: { label: string; home: number | null; away: number | null; pct: boolean }) {
  const h = home ?? 0, a = away ?? 0
  const total = h + a
  const hPct = total > 0 ? (h / total) * 100 : 50
  const homeWins = h >= a
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-bold ${homeWins ? 'text-white' : 'text-slate-400'}`}>{pct ? `${h}%` : h}</span>
        <span className="text-slate-500">{label}</span>
        <span className={`font-bold ${!homeWins ? 'text-white' : 'text-slate-400'}`}>{pct ? `${a}%` : a}</span>
      </div>
      <div className="flex gap-1 h-1.5">
        <div className="bg-slate-700 rounded-l overflow-hidden" style={{ width: `${hPct}%` }}>
          <div className="h-full bg-purple-500"></div>
        </div>
        <div className="bg-slate-700 rounded-r overflow-hidden flex-1">
          <div className="h-full bg-emerald-500 ml-auto" style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  )
}

function Content() {
  const params = useSearchParams()
  const home = params.get('home') || ''
  const away = params.get('away') || ''
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!home || !away) { setErr('Partido no especificado'); setLoading(false); return }
    fetch(`/api/bsd?type=find&home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`)
      .then(r => r.json())
      .then(j => { if (j.error) setErr('No encontré datos de este partido todavía.'); else setD(j); setLoading(false) })
      .catch(() => { setErr('Error al cargar el partido.'); setLoading(false) })
  }, [home, away])

  if (loading) return <p className="text-center text-slate-500 py-16">Cargando partido…</p>
  if (err || !d) return (
    <div className="text-center py-16">
      <p className="text-slate-400 mb-4">{err}</p>
      <Link href="/mundial" className="text-purple-400 hover:text-purple-300 text-sm">← Volver al Mundial</Link>
    </div>
  )

  const live = d.status === 'inprogress' || d.status === 'live'
  const done = d.status === 'finished'

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/mundial" className="text-sm text-purple-400 hover:text-purple-300">← Volver al Mundial</Link>

      <div className="mt-4 mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-center">
        {live && <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">● En vivo {d.minute != null ? `· ${d.minute}'` : ''}</div>}
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="font-bold text-white text-lg">{d.home}</div>
          <div>
            {done || live ? (
              <div className="text-4xl font-bold text-white">{d.homeScore}-{d.awayScore}</div>
            ) : (
              <div className="text-slate-400 text-sm">{new Date(d.date).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            )}
          </div>
          <div className="font-bold text-white text-lg">{d.away}</div>
        </div>
        {(d.homeXg != null || d.awayXg != null) && (
          <div className="mt-3 text-xs text-slate-400">xG: <span className="text-slate-200 font-semibold">{d.homeXg?.toFixed(2) ?? '–'}</span> — <span className="text-slate-200 font-semibold">{d.awayXg?.toFixed(2) ?? '–'}</span></div>
        )}
        <div className="mt-2 text-xs text-slate-500">
          {[d.venue, d.referee && `Árbitro: ${d.referee}`, d.attendance && `${d.attendance.toLocaleString('es-CL')} espectadores`].filter(Boolean).join(' · ')}
        </div>
      </div>

      {d.liveStats && d.liveStats.length > 0 && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Estadísticas {d.minutePlayed != null ? `· ${d.minutePlayed}'` : ''}</h2>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-purple-500"></span>{d.home}</span>
              <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{d.away}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-700/30">
            {d.liveStats.map((s, i) => <StatBar key={i} {...s} />)}
          </div>
        </div>
      )}

      {(d.homeForm || d.awayForm) && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[{ t: d.home, f: d.homeForm }, { t: d.away, f: d.awayForm }].map(({ t, f }, i) => f && (
            <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{t}</span>
                <FormBadges form={f.form} />
              </div>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>Goles últimos partidos: <span className="text-slate-200">{f.gf} a favor · {f.gc} en contra</span></div>
                <div>xG promedio: <span className="text-slate-200">{f.avgXg?.toFixed(2)}</span> · xG en contra: <span className="text-slate-200">{f.avgXgC?.toFixed(2)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.odds?.home != null && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 mb-6">
          <div className="text-xs text-slate-500 font-medium mb-2">Cuotas</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-slate-900/70 rounded-lg px-3 py-1.5 text-slate-300">{d.home}: <strong className="text-white">{d.odds.home}</strong></span>
            <span className="bg-slate-900/70 rounded-lg px-3 py-1.5 text-slate-300">Empate: <strong className="text-white">{d.odds.draw}</strong></span>
            <span className="bg-slate-900/70 rounded-lg px-3 py-1.5 text-slate-300">{d.away}: <strong className="text-white">{d.odds.away}</strong></span>
            {d.odds.over25 != null && <span className="bg-slate-900/70 rounded-lg px-3 py-1.5 text-slate-300">+2.5 goles: <strong className="text-white">{d.odds.over25}</strong></span>}
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Mientras más baja la cuota, más favorito es según las casas — dato útil para tu apuesta.</p>
        </div>
      )}

      {d.lineups ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Alineaciones</h2>
          <Pitch d={{ ...d.lineups, homeName: d.home, awayName: d.away }} />
          <div className="grid sm:grid-cols-2 gap-3">
            <TeamBench team={d.home} starters={d.lineups.home.players} subs={d.lineups.home.substitutes} align="left" />
            <TeamBench team={d.away} starters={d.lineups.away.players} subs={d.lineups.away.substitutes} align="right" />
          </div>
          {(d.homeCoach || d.awayCoach) && (
            <div className="text-xs text-slate-500">
              {[d.homeCoach && `DT ${d.home}: ${d.homeCoach}`, d.awayCoach && `DT ${d.away}: ${d.awayCoach}`].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 text-center text-sm text-slate-400">
          Las alineaciones aparecen ~1 hora antes del partido.
        </div>
      )}
    </div>
  )
}

export default function PartidoPage() {
  return (
    <Suspense fallback={<p className="text-center text-slate-500 py-16">Cargando…</p>}>
      <Content />
    </Suspense>
  )
}
