'use client'
import { useEffect, useState } from 'react'
import { supabase, Config } from '@/lib/supabase'

export default function ReglasPage() {
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    supabase.from('config').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setConfig(data)
    })
  }, [])

  if (!config) return <div className="text-gray-400 text-sm">Cargando...</div>

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <h2 className="text-base font-medium text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )

  const Row = ({ label, pts, highlight }: { label: string; pts: number; highlight?: boolean }) => (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${highlight ? 'text-amber-700' : ''}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${highlight ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
        {pts} pts
      </span>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Reglas de puntaje</h1>
        <p className="text-sm text-gray-500">El admin puede modificar los valores en la pestaña Admin → Puntos</p>
      </div>

      <Section title="🏆 Apuestas globales — antes del mundial">
        <p className="text-xs text-gray-400 mb-3">Una sola apuesta por categoría antes de que empiece el torneo. Se resuelven al final.</p>
        <Row label="Campeón del mundo acertado" pts={config.champion_pts} />
        <Row label="Goleador del torneo acertado" pts={config.scorer_pts} />
        <Row label="Mejor arquero acertado" pts={config.keeper_pts} />
        <Row label="Balón de Oro acertado" pts={config.mvp_pts} />
      </Section>

      <Section title="⚽ Apuestas por partido — favorito">
        <p className="text-xs text-gray-400 mb-3">El favorito es el equipo con mejor posición en el ranking FIFA.</p>
        <Row label="Marcador exacto correcto" pts={config.exact_score_pts} />
        <Row label="Ganador correcto (sin marcador)" pts={config.winner_only_pts} />
        <Row label="Empate con marcador exacto" pts={config.draw_exact_pts} />
        <Row label="Empate correcto (sin marcador)" pts={config.draw_only_pts} />
      </Section>

      <Section title="⚡ Apuestas por partido — no favorito">
        <p className="text-xs text-gray-400 mb-3">El no favorito es el equipo con peor posición en el ranking FIFA. Apostando a él y acertando se ganan más puntos.</p>
        <Row label="Marcador exacto del no favorito" pts={config.ud_exact_score_pts} highlight />
        <Row label="Victoria del no favorito (sin marcador)" pts={config.ud_winner_only_pts} highlight />
        <Row label="Empate exacto apostando al no favorito" pts={config.ud_draw_exact_pts} highlight />
        <Row label="Empate correcto apostando al no favorito" pts={config.ud_draw_only_pts} highlight />
      </Section>

      <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-900 mb-3">📋 Reglas generales</p>
        <p>• Si no acertás al ganador, no ganás puntos aunque el marcador sea correcto.</p>
        <p>• El marcador exacto solo da puntos adicionales si también acertaste al ganador.</p>
        <p>• El no favorito se define por ranking FIFA oficial al inicio del torneo. En fases eliminatorias el admin puede ajustarlo manualmente.</p>
        <p>• En partidos sin favorito definido (knockout), todos ganan los mismos puntos sin bonus.</p>
        <p>• Las apuestas globales se cierran al inicio del torneo y no se pueden modificar.</p>
        <p>• Las predicciones por partido se pueden modificar hasta que el admin ingrese el resultado.</p>
      </div>
    </div>
  )
}
