'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Player } from '@/lib/supabase'

const ADMIN_PIN = '1926'

export default function LoginPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [step, setStep] = useState<'select' | 'pin' | 'create' | 'register'>('select')
  const [selected, setSelected] = useState<Player | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newPin, setNewPin] = useState('')

  useEffect(() => {
    // Si ya hay sesión, redirigir
    const stored = localStorage.getItem('mundial_session')
    if (stored) router.push('/')
    supabase.from('players').select('*').order('name').then(({ data }) => setPlayers(data ?? []))
  }, [])

  function selectPlayer(p: Player) {
    setSelected(p)
    setPin('')
    setError('')
    if (p.pin) {
      setStep('pin')
    } else {
      setStep('create')
    }
  }

  async function handleLogin() {
    if (!selected) return
    if (pin === selected.pin) {
      const session = { playerId: selected.id, playerName: selected.name, playerEmoji: selected.emoji, isAdmin: false }
      localStorage.setItem('mundial_session', JSON.stringify(session))
      window.dispatchEvent(new Event('session_changed'))
      router.push('/jugador')
    } else {
      setError('PIN incorrecto')
      setPin('')
    }
  }

  async function handleCreatePin() {
    if (!selected) return
    if (pin.length !== 4) { setError('El PIN debe tener 4 dígitos'); return }
    await supabase.from('players').update({ pin }).eq('id', selected.id)
    const session = { playerId: selected.id, playerName: selected.name, playerEmoji: selected.emoji, isAdmin: false }
    localStorage.setItem('mundial_session', JSON.stringify(session))
    window.dispatchEvent(new Event('session_changed'))
    router.push('/jugador')
  }

  async function handleRegister() {
    if (!newName.trim()) { setError('Ingresa un nombre'); return }
    if (newPin.length !== 4) { setError('El PIN debe tener 4 dígitos'); return }
    const emoji = newEmoji.trim() || '👤'
    const { data, error } = await supabase
      .from('players')
      .insert({ name: newName.trim(), emoji, pin: newPin })
      .select().single()
    if (error || !data) { setError('Error al crear jugador'); return }
    const session = { playerId: data.id, playerName: data.name, playerEmoji: data.emoji, isAdmin: false }
    localStorage.setItem('mundial_session', JSON.stringify(session))
    window.dispatchEvent(new Event('session_changed'))
    router.push('/jugador')
  }

  function handleAdminLogin() {
    if (adminPin === ADMIN_PIN) {
      const session = { playerId: 'admin', playerName: 'Admin', playerEmoji: '👑', isAdmin: true }
      localStorage.setItem('mundial_session', JSON.stringify(session))
      window.dispatchEvent(new Event('session_changed'))
      router.push('/admin')
    } else {
      setError('PIN de admin incorrecto')
      setAdminPin('')
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-medium text-gray-900 mb-2">Iniciar sesión</h1>
      <p className="text-sm text-gray-500 mb-8">Selecciona tu nombre para acceder a tus apuestas</p>

      {step === 'select' && (
        <div>
          <div className="space-y-2 mb-6">
            {players.map(p => (
              <button key={p.id} onClick={() => selectPlayer(p)}
                className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-purple-300 hover:bg-purple-50 transition-all text-left">
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.pin ? 'Tiene PIN configurado' : 'Sin PIN — deberás crear uno'}</div>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => { setStep('register'); setError('') }}
            className="w-full text-left px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-all mb-4">
            <div className="font-medium text-purple-700 text-sm">+ Crear nuevo jugador</div>
            <div className="text-xs text-purple-500 mt-0.5">Únete al torneo con tu propio nombre y PIN</div>
          </button>
          <div className="border-t border-gray-100 pt-4">
            <button onClick={() => setShowAdmin(!showAdmin)}
              className="text-xs text-gray-400 hover:text-gray-600">
              Acceso administrador
            </button>
            {showAdmin && (
              <div className="mt-3">
                <input type="password" inputMode="numeric" maxLength={4}
                  placeholder="PIN admin"
                  value={adminPin}
                  onChange={e => { setAdminPin(e.target.value); setError('') }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center tracking-widest mb-2"
                />
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                <button onClick={handleAdminLogin}
                  className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-800">
                  Entrar como admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'pin' && selected && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{selected.emoji}</span>
            <div>
              <div className="font-medium text-gray-900">{selected.name}</div>
              <div className="text-xs text-gray-400">Ingresa tu PIN de 4 dígitos</div>
            </div>
          </div>
          <input type="password" inputMode="numeric" maxLength={4}
            placeholder="• • • •"
            value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-xl tracking-widest mb-3"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
          <button onClick={handleLogin}
            className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 mb-2">
            Entrar
          </button>
          <button onClick={() => { setStep('select'); setSelected(null); setError('') }}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
            Volver
          </button>
        </div>
      )}

      {step === 'register' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">Crear nuevo jugador</h2>
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">Nombre</label>
            <input type="text" placeholder="Ej: Cristóbal" value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" autoFocus />
          </div>
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">Emoji (opcional)</label>
            <input type="text" placeholder="🦁" value={newEmoji} maxLength={2}
              onChange={e => setNewEmoji(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-xl" />
          </div>
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">PIN de 4 dígitos</label>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="• • • •"
              value={newPin} onChange={e => { setNewPin(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-xl tracking-widest" />
          </div>
          {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
          <button onClick={handleRegister}
            className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 mb-2">
            Crear jugador y entrar
          </button>
          <button onClick={() => { setStep('select'); setError('') }}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
            Volver
          </button>
        </div>
      )}

      {step === 'create' && selected && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{selected.emoji}</span>
            <div>
              <div className="font-medium text-gray-900">{selected.name}</div>
              <div className="text-xs text-gray-400">Primera vez — crea tu PIN de 4 dígitos</div>
            </div>
          </div>
          <input type="password" inputMode="numeric" maxLength={4}
            placeholder="• • • •"
            value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreatePin()}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-xl tracking-widest mb-3"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
          <button onClick={handleCreatePin}
            className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 mb-2">
            Crear PIN y entrar
          </button>
          <button onClick={() => { setStep('select'); setSelected(null); setError('') }}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
            Volver
          </button>
        </div>
      )}
    </div>
  )
}
