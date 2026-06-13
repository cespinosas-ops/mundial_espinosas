'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Game = {
  id: number; home: string; away: string; date: string; status: string
  homeScore: number | null; awayScore: number | null; group: string | null; round: string | null
}
type Team = { name: string; country: string | null; coach: string | null; games: Game[] }

function GameRow({ g }: { g: Game }) {
  const done = g.status === 'finished'
  const live = g.status === 'inprogress' || g.status === '1st_half' || g.status === '2nd_half'
  return (
    <Link href={`/mundial/partido?home=${encodeURIComponent(g.home)}&away=${encodeURIComponent(g.away)}`}
      className="flex items-center gap-3 px-4 py-3 text-sm border-t border-slate-700/40 first:border-t-0 hover:bg-slate-800/80 transition-colors">
      <div className="flex-1 text-right text-slate-300">{g.home}</div>
      <div className="min-w-[64px] text-center">
        {done || live ? (
          <span className={`font-bold ${live ? 'text-red-400' : 'text-white'}`}>{g.homeScore}-{g.awayScore}</span>
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
    fetch(`/api/bsd?type=team&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(j => { if (j.error) setErr('No encontré datos de esta selección.'); else setT(j); setLoading(false) })
      .catch(() => { setErr('Error al cargar.'); setLoading(false) })
  }, [name])

  if (loading) return <p className="text-center text-slate-500 py-16">Cargando…</p>
  if (err || !t) return (
    <div className="text-center py-16">
      <p className="text-slate-400 mb-4">{err}</p>
      <Link href="/mundial" className="text-purple-400 hover:text-purple-300 text-sm">← Volver al Mundial</Link>
    </div>
  )

  const played = t.games.filter(g => g.status === 'finished')
  const upcoming = t.games.filter(g => g.status !== 'finished')

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/mundial" className="text-sm text-purple-400 hover:text-purple-300">← Volver al Mundial</Link>

      <div className="mt-4 mb-6">
        <h1 className="text-3xl font-bold text-white">{t.name}</h1>
        {t.coach && <p className="text-sm text-slate-400 mt-1">DT: {t.coach}</p>}
      </div>

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white mb-3">Próximos partidos</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {upcoming.map(g => <GameRow key={g.id} g={g} />)}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Partidos jugados</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {played.map(g => <GameRow key={g.id} g={g} />)}
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
