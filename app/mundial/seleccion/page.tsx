'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Game = {
  id: number; home: string; away: string; date: string; status: string
  homeScore: number | null; awayScore: number | null; group: string | null; round: string | null
}
type Standing = {
  group: string; position: number; played: number; won: number; draw: number; lost: number
  gf: number; ga: number; gd: number; points: number; crest: string | null
}
type Form = { form: string; gf: number; gc: number; avgXg: number; avgXgC: number }
type Team = { name: string; country: string | null; coach: string | null; crest: string | null; standing: Standing | null; form: Form | null; games: Game[] }

function FormBadges({ form }: { form: string }) {
  return (
    <span className="inline-flex gap-1">
      {form.split('').map((c, i) => (
        <span key={i} className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
          c === 'W' ? 'bg-emerald-500 text-white' : c === 'D' ? 'bg-slate-500 text-white' : 'bg-red-500 text-white'
        }`}>{c === 'W' ? 'G' : c === 'D' ? 'E' : 'P'}</span>
      ))}
    </span>
  )
}

function GameRow({ g, teamName }: { g: Game; teamName: string }) {
  const done = g.status === 'finished'
  const isHome = g.home === teamName
  const myScore = isHome ? g.homeScore : g.awayScore
  const rivalScore = isHome ? g.awayScore : g.homeScore
  const won = done && myScore != null && rivalScore != null && myScore > rivalScore
  const lost = done && myScore != null && rivalScore != null && myScore < rivalScore
  return (
    <Link href={`/mundial/partido?home=${encodeURIComponent(g.home)}&away=${encodeURIComponent(g.away)}`}
      className="flex items-center gap-3 px-4 py-3.5 text-sm border-t border-slate-700/40 first:border-t-0 hover:bg-slate-800/80 transition-colors">
      {g.round && <span className="text-[10px] text-slate-500 w-16 shrink-0">{g.round}</span>}
      <div className="flex-1 text-right text-slate-300">{g.home}</div>
      <div className="min-w-[64px] text-center">
        {done ? (
          <span className={`font-bold ${won ? 'text-emerald-400' : lost ? 'text-red-400' : 'text-slate-300'}`}>{g.homeScore}-{g.awayScore}</span>
        ) : (
          <span className="text-xs text-slate-500">{new Date(g.date).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      <div className="flex-1 text-slate-300">{g.away}</div>
    </Link>
  )
}

function Content() {
  const params = useSearchParams()
  const name = params.get('name') || ''
  const [t, setT] = useState<Team | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!name) { setErr('Selección no especificada'); setLoading(false); return }
    setLoading(true)
    fetch(`/api/bsd?type=team&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(j => { if (j.error) setErr('No encontré datos de esta selección.'); else { setT(j); setErr('') } setLoading(false) })
      .catch(() => { setErr('Error al cargar.'); setLoading(false) })
  }, [name])

  if (loading) return <p className="text-center text-slate-500 py-16">Cargando…</p>
  if (err || !t) return (
    <div className="text-center py-16">
      <p className="text-slate-400 mb-4">{err}</p>
      <Link href="/mundial?tab=selecciones" className="text-purple-400 hover:text-purple-300 text-sm">← Volver a Selecciones</Link>
    </div>
  )

  const played = t.games.filter(g => g.status === 'finished')
  const upcoming = t.games.filter(g => g.status !== 'finished')
  const s = t.standing

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/mundial?tab=selecciones" className="text-sm text-purple-400 hover:text-purple-300">← Selecciones</Link>

      <div className="mt-4 mb-6 flex items-center gap-4">
        {t.crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.crest} alt={t.name} className="w-16 h-16 object-contain" />
        ) : <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl">🏳️</div>}
        <div>
          <h1 className="text-3xl font-bold text-white">{t.name}</h1>
          {t.coach && <p className="text-sm text-slate-400 mt-0.5">DT: {t.coach}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {s && (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{s.position}°</div>
            <div className="text-xs text-slate-400 mt-1">{s.group}</div>
          </div>
        )}
        {s && (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{s.points}</div>
            <div className="text-xs text-slate-400 mt-1">Puntos</div>
          </div>
        )}
        {s && (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{s.gf}<span className="text-slate-600 text-base">:</span>{s.ga}</div>
            <div className="text-xs text-slate-400 mt-1">Goles (F:C)</div>
          </div>
        )}
        {s && (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 text-center">
            <div className="text-sm font-bold text-white pt-1">{s.won}G {s.draw}E {s.lost}P</div>
            <div className="text-xs text-slate-400 mt-1.5">{s.played} jugados</div>
          </div>
        )}
      </div>

      {t.form && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Forma reciente</span>
            <FormBadges form={t.form.form} />
          </div>
          <div className="text-xs text-slate-400">
            xG promedio: <span className="text-slate-200">{t.form.avgXg?.toFixed(2)}</span> · en contra: <span className="text-slate-200">{t.form.avgXgC?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white mb-3">Próximos partidos</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {upcoming.map(g => <GameRow key={g.id} g={g} teamName={t.name} />)}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Partidos jugados</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {played.map(g => <GameRow key={g.id} g={g} teamName={t.name} />)}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 mt-4">Toca un partido para ver alineaciones, estadísticas y más.</p>
    </div>
  )
}

export default function SeleccionPage() {
  return (
    <Suspense fallback={<p className="text-center text-slate-500 py-16">Cargando…</p>}>
      <Content />
    </Suspense>
  )
}
