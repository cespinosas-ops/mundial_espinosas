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

  if (!config) return <div className="text-slate-500 text-sm">Cargando...</div>

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 mb-4">
      <h2 className="text-base font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )

  const Row = ({ label, pts, highlight }: { label: string; pts: number; highlight?: boolean }) => (
    <div className={`flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0`}>
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${highlight ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'}`}>
        {pts} pts
      </span>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Reglas de puntaje</h1>
        <p className="text-sm text-slate-400">El admin puede modificar los valores en la pestaña Admin → Puntos</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-sm text-slate-300 space-y-2">
        <p className="font-semibold text-white mb-3">📋 Reglas generales</p>
        <p>• Si le achuntái al marcador exacto, te llevái los puntos máximos — eso incluye automáticamente achuntarle al ganador.</p>
        <p>• Si no le achuntái al marcador pero sí al ganador (o al empate), te llevái puntos parciales.</p>
        <p>• Si no le achuntái al ganador, obviamente no le achuntái al marcador tampoco y no ganái puntos.</p>
        <p>• El no favorito se define por ranking FIFA oficial. Apostarle al no favorito y achuntarle da más puntos que apostarle al favorito.</p>
        <p>• En fases eliminatorias, el bonus del no favorito se va a ir decidiendo partido a partido.</p>
        <p>• Las predicciones por partido se pueden cambiar hasta 20 minutos antes del partido.</p>
        <p>• Las apuestas globales (campeón, goleador, arquero) se hacen antes del mundial y no se pueden cambiar una vez que empiece.</p>
      </div>

      <div className="mt-4"></div>

      <Section title="🏆 Apuestas globales — antes del mundial">
        <p className="text-xs text-slate-500 mb-3">Una sola apuesta por categoría antes de que empiece el torneo. Se resuelven al final.</p>
        <Row label="Campeón del mundo acertado" pts={config.champion_pts} />
        <Row label="Goleador del torneo acertado" pts={config.scorer_pts} />
        <Row label="Mejor arquero acertado" pts={config.keeper_pts} />
      </Section>

      <Section title="⚽ Apuestas por partido — favorito">
        <p className="text-xs text-slate-500 mb-3">El favorito es el equipo con mejor posición en el ranking FIFA.</p>
        <Row label="Marcador exacto correcto" pts={config.exact_score_pts} />
        <Row label="Ganador correcto (sin marcador)" pts={config.winner_only_pts} />
        <Row label="Empate con marcador exacto" pts={config.draw_exact_pts} />
        <Row label="Empate correcto (sin marcador)" pts={config.draw_only_pts} />
      </Section>

      <Section title="⚡ Apuestas por partido — no favorito">
        <p className="text-xs text-slate-500 mb-3">El no favorito es el equipo con peor posición en el ranking FIFA. Apostando a él y acertando se ganan más puntos.</p>
        <Row label="Marcador exacto del no favorito" pts={config.ud_exact_score_pts} highlight />
        <Row label="Victoria del no favorito (sin marcador)" pts={config.ud_winner_only_pts} highlight />
        <Row label="Empate exacto apostando al no favorito" pts={config.ud_draw_exact_pts} highlight />
        <Row label="Empate correcto apostando al no favorito" pts={config.ud_draw_only_pts} highlight />
      </Section>
    </div>
  )
}
