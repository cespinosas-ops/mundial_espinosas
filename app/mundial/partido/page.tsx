'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type P = {
  name: string; number: string; position: string; rating: number | null
  goals: number; yellow: boolean; red: boolean; subIn: number | null; subOut: number | null
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
  lineups: { home: { players: P[]; formation: string | null }; away: { players: P[]; formation: string | null } } | null
}

const POS_ORDER = ['G', 'D', 'M', 'F']
const POS_LABEL: Record<string, string> = { G: 'Arquero', D: 'Defensas', M: 'Mediocampo', F: 'Delanteros' }

function ratingColor(r: number | null) {
  if (r == null) return 'bg-slate-700 text-slate-300'
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

function TeamLineup({ title, players, formation, starters }: { title: string; players: P[]; formation: string | null; starters: boolean }) {
  const xi = players.filter(p => starters ? p.subIn == null : p.subIn != null)
  if (!xi.length) return null
  if (!starters) {
    return (
      <div className="mt-3">
        <div className="text-xs text-slate-500 font-medium mb-1.5">Ingresaron</div>
        <div className="flex flex-wrap gap-1.5">
          {xi.map((p, i) => (
            <span key={i} className="text-xs bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-slate-300">
              {p.subIn}&apos; #{p.number} {p.name}{p.goals > 0 ? ' ⚽' : ''}{p.yellow ? ' 🟨' : ''}{p.red ? ' 🟥' : ''}
            </span>
          ))}
        </div>
      </div>
    )
  }
  const byPos: Record<string, P[]> = {}
  xi.forEach(p => { (byPos[p.position] ||= []).push(p) })
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white text-sm">{title}</span>
        {formation && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{formation}</span>}
      </div>
      <div className="rounded-xl bg-gradient-to-b from-emerald-900/40 to-emerald-950/40 border border-emerald-800/30 p-3 space-y-3">
        {POS_ORDER.map(pos => byPos[pos] && (
          <div key={pos}>
            <div className="text-[10px] text-emerald-500/70 uppercase tracking-wider mb-1.5">{POS_LABEL[pos]}</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {byPos[pos].map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-900/70 rounded-lg px-2 py-1.5 text-xs">
                  <span className="text-slate-500 font-mono">{p.number}</span>
                  <span className="text-slate-100">{p.name}</span>
                  {p.goals > 0 && <span>{'⚽'.repeat(p.goals)}</span>}
                  {p.yellow && <span>🟨</span>}
                  {p.red && <span>🟥</span>}
                  {p.subOut != null && <span className="text-red-400 text-[10px]">↓{p.subOut}&apos;</span>}
                  {p.rating != null && <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${ratingColor(p.rating)}`}>{p.rating}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
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
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white">Alineaciones</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <TeamLineup title={d.home} players={d.lineups.home.players} formation={d.lineups.home.formation} starters />
              <TeamLineup title={d.home} players={d.lineups.home.players} formation={null} starters={false} />
              {d.homeCoach && <div className="text-xs text-slate-500 mt-2">DT: {d.homeCoach}</div>}
            </div>
            <div>
              <TeamLineup title={d.away} players={d.lineups.away.players} formation={d.lineups.away.formation} starters />
              <TeamLineup title={d.away} players={d.lineups.away.players} formation={null} starters={false} />
              {d.awayCoach && <div className="text-xs text-slate-500 mt-2">DT: {d.awayCoach}</div>}
            </div>
          </div>
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
