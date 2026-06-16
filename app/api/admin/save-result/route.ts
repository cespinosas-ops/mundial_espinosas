import { NextResponse } from 'next/server'
import { getSupabaseAdmin, checkAdminSecret } from '@/lib/supabaseAdmin'
import { calculateMatchPoints } from '@/lib/fifa'

export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'body inválido' }, { status: 400 }) }

  const { matchId, homeGoals, awayGoals } = body
  if (!matchId || typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
    return NextResponse.json({ error: 'faltan datos' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // 1) Traer el partido (para underdog)
  const { data: match, error: mErr } = await supabaseAdmin
    .from('matches').select('*').eq('id', matchId).single()
  if (mErr || !match) return NextResponse.json({ error: 'partido no encontrado' }, { status: 404 })

  // 2) Traer la config (para puntajes)
  const { data: cfgRows } = await supabaseAdmin.from('config').select('*').eq('id', 1)
  const config = cfgRows?.[0]
  if (!config) return NextResponse.json({ error: 'config no encontrada' }, { status: 500 })

  // 3) Guardar el resultado
  const { error: updErr } = await supabaseAdmin
    .from('matches').update({ result_home: homeGoals, result_away: awayGoals }).eq('id', matchId)
  if (updErr) return NextResponse.json({ error: 'no se pudo guardar' }, { status: 500 })

  // 4) Recalcular puntos de todas las predicciones de este partido
  const { data: preds } = await supabaseAdmin
    .from('predictions').select('*').eq('match_id', matchId)
  if (preds) {
    for (const pred of preds) {
      const pts = calculateMatchPoints(
        { picked_team: pred.picked_team, home_goals: pred.home_goals, away_goals: pred.away_goals },
        { home: homeGoals, away: awayGoals },
        match.underdog,
        {
          exact_score_pts: config.exact_score_pts, winner_only_pts: config.winner_only_pts,
          draw_exact_pts: config.draw_exact_pts, draw_only_pts: config.draw_only_pts,
          ud_exact_score_pts: config.ud_exact_score_pts, ud_winner_only_pts: config.ud_winner_only_pts,
          ud_draw_exact_pts: config.ud_draw_exact_pts, ud_draw_only_pts: config.ud_draw_only_pts,
        }
      )
      await supabaseAdmin.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
    }
  }

  return NextResponse.json({ ok: true, updated: preds?.length ?? 0 })
}
