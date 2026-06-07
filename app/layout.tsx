import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Torneo Familiar — Mundial 2026',
  description: 'Prode familiar para el Mundial FIFA 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
