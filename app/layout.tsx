import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Torneo Familiar — Mundial 2026',
  description: 'Prode familiar para el Mundial FIFA 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-gray-900">
              🏆 Mundial 2026
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Tabla</Link>
              <Link href="/jugador" className="text-gray-600 hover:text-gray-900">Mis apuestas</Link>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">Admin</Link>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
