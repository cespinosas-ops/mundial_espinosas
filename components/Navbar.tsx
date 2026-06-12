'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Match = {
  id: string
  home: string
  away: string
  match_date: string
  result_home: number | null
}

type Session = {
  playerId: string
  playerName: string
  playerEmoji: string
  isAdmin: boolean
}

const ADMIN_PIN = '1926' // PIN del admin — cámbialo a lo que quieras

export default function Navbar() {
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Cargar sesión desde localStorage
    const stored = localStorage.getItem('mundial_session')
    if (stored) {
      try { setSession(JSON.parse(stored)) } catch {}
    }

    // Cargar partidos próximos
    supabase.from('matches').select('id,home,away,match_date,result_home')
      .is('result_home', null)
      .order('match_date', { ascending: true })
      .limit(5)
      .then(({ data }) => { if (data) setUpcomingMatches(data) })

    // Actualizar reloj cada segundo
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Escuchar cambios de sesión desde otras páginas
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem('mundial_session')
      if (stored) {
        try { setSession(JSON.parse(stored)) } catch {}
      } else {
        setSession(null)
      }
    }
    window.addEventListener('session_changed', handler)
    return () => window.removeEventListener('session_changed', handler)
  }, [])

  function logout() {
    localStorage.removeItem('mundial_session')
    setSession(null)
    window.dispatchEvent(new Event('session_changed'))
    setMenuOpen(false)
  }

  // Partidos próximos (sin resultado, en las próximas 24h)
  const nextMatches = upcomingMatches.filter(m => {
    const matchTime = new Date(m.match_date).getTime()
    const diff = matchTime - now.getTime()
    const timeSinceStart = now.getTime() - matchTime
    // Show if: within 24h before start, OR within 2h after start
    return diff < 24 * 60 * 60 * 1000 && timeSinceStart < 2 * 60 * 60 * 1000
  }).slice(0, 3)

  function formatCountdown(matchDate: string) {
    const lockTime = new Date(matchDate).getTime() - 20 * 60 * 1000
    const diff = lockTime - now.getTime()
    if (diff <= 0) return 'CERRADO'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  function isLocked(matchDate: string) {
    const diff = new Date(matchDate).getTime() - now.getTime()
    return diff < 20 * 60 * 1000
  }

  const links = [
    { href: '/', label: 'Tabla' },
    { href: '/jugador', label: 'Mis apuestas' },
    { href: '/apuestas', label: 'Apuestas' },
    { href: '/mundial', label: 'Mundial' },
    { href: '/reglas', label: 'Reglas' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <div className="sticky top-0 z-50">
      {/* Barra de countdown */}
      {nextMatches.length > 0 && (
        <div className="bg-gray-900 text-white text-xs px-4 py-1.5 flex items-center gap-4 overflow-x-auto">
          <span className="text-gray-400 shrink-0">⏱ Cierre apuestas:</span>
          {nextMatches.map(m => {
            const locked = isLocked(m.match_date)
            return (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                <span className={locked ? 'text-red-400 font-medium' : 'text-white'}>
                  {m.home} vs {m.away}
                </span>
                <span className={`font-mono font-bold ${locked ? 'text-red-400' : 'text-green-400'}`}>
                  {locked ? '🔒 Cerrado' : formatCountdown(m.match_date)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Nav principal */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">🏆 Mundial 2026</Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-4 text-sm">
              {links.map(l => (
                <Link key={l.href} href={l.href}
                  className={`hover:text-gray-900 ${pathname === l.href ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                  {l.label}
                </Link>
              ))}
            </div>
            {/* Sesión */}
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all">
                {session ? (
                  <>
                    <span>{session.playerEmoji}</span>
                    <span className="font-medium text-gray-900 max-w-20 truncate">{session.isAdmin ? '👑 Admin' : session.playerName}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Iniciar sesión</span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48 z-50">
                  {session ? (
                    <>
                      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
                        Sesión de {session.isAdmin ? 'Admin' : session.playerName}
                      </div>
                      <button onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <Link href="/login" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Iniciar sesión
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Nav móvil */}
        <div className="sm:hidden flex gap-3 px-4 pb-2 text-sm overflow-x-auto">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`shrink-0 hover:text-gray-900 ${pathname === l.href ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
