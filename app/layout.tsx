import './globals.css'
import Navbar from '@/components/Navbar'
import ChatWidget from '@/components/ChatWidget'
import InstallButton from '@/components/InstallButton'
import type { Viewport } from 'next'

export const metadata = {
  title: 'Torneo Familiar — Mundial 2026',
  description: 'Prode familiar para el Mundial FIFA 2026',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent' as const,
    title: 'Mundial 2026',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <ChatWidget />
        <InstallButton />
      </body>
    </html>
  )
}
