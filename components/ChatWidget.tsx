'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase, Player } from '@/lib/supabase'

type ChatMessage = {
  id: string
  player_id: string
  message: string
  created_at: string
  player?: Player
}

type Session = { playerId: string; playerName: string; playerEmoji: string; isAdmin: boolean }

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSeenRef = useRef<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('mundial_session')
    if (stored) {
      try { setSession(JSON.parse(stored)) } catch {}
    }
    const handler = () => {
      const s = localStorage.getItem('mundial_session')
      if (s) { try { setSession(JSON.parse(s)) } catch {} } else { setSession(null) }
    }
    window.addEventListener('session_changed', handler)

    // Load players for avatar lookup
    supabase.from('players').select('*').then(({ data }) => setPlayers(data ?? []))

    // Load last 50 messages
    supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => {
        setMessages(data ?? [])
        if (data && data.length > 0) {
          const lastSeen = localStorage.getItem('chat_last_seen')
          const unreadCount = data.filter(m => !lastSeen || new Date(m.created_at) > new Date(lastSeen)).length
          setUnread(unreadCount)
        }
      })

    // Realtime subscription
    const channel = supabase
      .channel('chat_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage])
      })
      .subscribe()

    return () => {
      window.removeEventListener('session_changed', handler)
      supabase.removeChannel(channel)
    }
  }, [])

  // Track unread when new message arrives and chat is closed
  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!open) {
      const lastSeen = localStorage.getItem('chat_last_seen')
      if (!lastSeen || new Date(last.created_at) > new Date(lastSeen)) {
        setUnread(prev => prev + (prev === 0 ? 1 : 1))
      }
    }
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      setUnread(0)
      localStorage.setItem('chat_last_seen', new Date().toISOString())
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [open, messages.length])

  async function sendMessage() {
    if (!session || !input.trim()) return
    const text = input.trim()
    setInput('')
    await supabase.from('chat_messages').insert({ player_id: session.playerId, message: text })
  }

  function getPlayer(playerId: string): { name: string; emoji: string } {
    if (playerId === 'admin') return { name: 'Admin', emoji: '👑' }
    const p = players.find(p => p.id === playerId)
    return p ? { name: p.name, emoji: p.emoji } : { name: '???', emoji: '👤' }
  }

  if (!session) return null

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-purple-700 transition-all">
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[90vw] max-w-sm h-[60vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-medium text-sm">💬 Chat del torneo</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-950/50">
            {messages.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-8">Nadie ha escrito todavía. ¡Sé el primero!</div>
            )}
            {messages.map(m => {
              const p = getPlayer(m.player_id)
              const isMe = m.player_id === session.playerId
              return (
                <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-lg shrink-0">{p.emoji}</span>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-100'}`}>
                    <div className={`text-[10px] font-medium mb-0.5 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                      {p.name} · {new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm break-words">{m.message}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-700 p-2 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 border border-slate-700 bg-slate-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-400 placeholder:text-slate-500"
            />
            <button onClick={sendMessage}
              className="bg-purple-600 text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0 hover:bg-purple-700 disabled:opacity-40"
              disabled={!input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
