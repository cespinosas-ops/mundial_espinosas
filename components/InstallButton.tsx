'use client'
import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    if (standalone) { setInstalled(true); return }

    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIOS(ios)

    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (installed) return null
  if (!isIOS && !deferred) return null

  const handleClick = async () => {
    if (isIOS) { setShowIOSHelp(true); return }
    if (deferred) {
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    }
  }

  return (
    <>
      <button onClick={handleClick}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors">
        <span>⬇️</span> Descargar app
      </button>

      {showIOSHelp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setShowIOSHelp(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-3">Instalar en iPhone</h3>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>Toca el botón <strong>Compartir</strong> (el cuadrito con la flecha ↑) abajo en Safari</li>
              <li>Baja y toca <strong>&quot;Agregar a inicio&quot;</strong></li>
              <li>Toca <strong>Agregar</strong> arriba a la derecha</li>
            </ol>
            <p className="text-xs text-slate-500 mt-3">Quedará el ícono del trofeo en tu pantalla de inicio 🏆</p>
            <button onClick={() => setShowIOSHelp(false)} className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2.5 rounded-lg">Entendido</button>
          </div>
        </div>
      )}
    </>
  )
}
