import { NextResponse } from 'next/server'
import { getSupabaseAdmin, checkAdminSecret } from '@/lib/supabaseAdmin'
import { calculateMatchPoints } from '@/lib/fifa'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { error: drawErr } = await supabaseAdmin
    .from('predictions')
    .update({ home_goals: 0, away_goals: 0 })
    .eq('picked_team', 'draw')
    .is('home_goals', null)
    .is('away_goals', null)
  if (drawErr) return NextResponse.json({ error: 'error convirtiendo empates' }, { status: 500 })

  const { data: cfgRows } = await supabaseAdmin.from('config').select('*').eq('id', 1)
  const config = cfgRows?.[0]
  if (!config) return NextResponse.json({ error: 'config no encontrada' }, { status: 500 })

  const { data: matches, error: mErr } = await supabaseAdmin
    .from('matches').select('*')
    .not('result_home', 'is', null)
    .not('result_away', 'is', null)
  if (mErr) return NextResponse.json({ error: 'error leyendo partidos' }, { status: 500 })

  let recalculadas = 0
  const detalle: string[] = []

  for (const match of matches || []) {
    const { data: preds } = await supabaseAdmin
      .from('predictions').select('*').eq('match_id', match.id)
    if (!preds) continue

    let cambios = 0
    for (const pred of preds) {
      const pts = calculateMatchPoints(
        { picked_team: pred.picked_team, home_goals: pred.home_goals, away_goals: pred.away_goals },
        { home: match.result_home, away: match.result_away },
        match.underdog,
        {
          exact_score_pts: config.exact_score_pts, winner_only_pts: config.winner_only_pts,
          draw_exact_pts: config.draw_exact_pts, draw_only_pts: config.draw_only_pts,
          ud_exact_score_pts: config.ud_exact_score_pts, ud_winner_only_pts: config.ud_winner_only_pts,
          ud_draw_exact_pts: config.ud_draw_exact_pts, ud_draw_only_pts: config.ud_draw_only_pts,
        }
      )
      if (pts !== pred.points_earned) {
        await supabaseAdmin.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
        cambios++
      }
      recalculadas++
    }
    if (cambios > 0) detalle.push(`${match.home} vs ${match.away}: ${cambios} corregidas`)
  }

  return NextResponse.json({ ok: true, recalculadas, partidos: matches?.length ?? 0, detalle })
}
