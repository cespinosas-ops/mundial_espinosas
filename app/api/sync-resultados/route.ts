import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { calculateMatchPoints } from '@/lib/fifa'

export const dynamic = 'force-dynamic'

const BSD_TOKEN = process.env.BSD_TOKEN || '632069d193292b249c4e6947e6c9b17c1efc4e44'
const BSD_BASE = 'https://sports.bzzoiro.com'
const LEAGUE = 27

let lastSync = 0
const SYNC_COOLDOWN_MS = 2 * 60 * 1000

const ALIASES: Record<string, string> = {
  'turkiye': 'turkey',
  'bosnia & herzegovina': 'bosnia and herzegovina',
  'bosnia-herzegovina': 'bosnia and herzegovina',
  'usa': 'united states',
  'korea republic': 'south korea',
  'czech republic': 'czechia',
  "cote d'ivoire": 'ivory coast',
  'cabo verde': 'cape verde',
  'cabo verde islands': 'cape verde',
  'cape verde islands': 'cape verde',
  'ir iran': 'iran',
}

function norm(name: string): string {
  let s = (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  s = s.toLowerCase().replace(/'/g, '').trim()
  return ALIASES[s] || s
}

async function bsd(path: string) {
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { Authorization: `Token ${BSD_TOKEN}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`bsd ${res.status}`)
  return res.json()
}

async function allMatches() {
  const seen = new Set<number>()
  const out: any[] = []
  let page = 1
  let prevFirstId: number | null = null
  while (page <= 6) {
    const data = await bsd(`/api/matches/?league=${LEAGUE}&date_from=2026-06-01&date_to=2026-07-31&page=${page}`)
    const res = data.results || []
    if (!res.length) break
    if (res[0]?.id === prevFirstId) break
    prevFirstId = res[0]?.id ?? null
    let added = 0
    for (const m of res) {
      if (!seen.has(m.id)) { seen.add(m.id); out.push(m); added++ }
    }
    if (added === 0) break
    if (!data.next) break
    page++
  }
  return out
}

export async function GET() {
  const now = Date.now()
  if (now - lastSync < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, skip: true, mensaje: 'sincronizado recientemente' })
  }
  lastSync = now

  const supabaseAdmin = getSupabaseAdmin()

  const { data: pendientes, error: pErr } = await supabaseAdmin
    .from('matches').select('*').is('result_home', null)
  if (pErr) return NextResponse.json({ error: 'error leyendo partidos' }, { status: 500 })
  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ ok: true, sincronizados: 0, mensaje: 'nada pendiente' })
  }

  const { data: cfgRows } = await supabaseAdmin.from('config').select('*').eq('id', 1)
  const config = cfgRows?.[0]
  if (!config) return NextResponse.json({ error: 'config no encontrada' }, { status: 500 })

  let bsdMatches: any[] = []
  try { bsdMatches = await allMatches() } catch { return NextResponse.json({ error: 'error BSD' }, { status: 502 }) }

  const sincronizados: string[] = []

  for (const match of pendientes) {
    const h = norm(match.home), a = norm(match.away)
    const found = bsdMatches.find((m: any) => {
      const bh = norm(m.home_team), ba = norm(m.away_team)
      return (bh === h && ba === a) || (bh === a && ba === h)
    })
    if (!found) continue
    if (found.status !== 'finished') continue
    if (found.home_score == null || found.away_score == null) continue

    const sameOrder = norm(found.home_team) === h
    const homeGoals = sameOrder ? found.home_score : found.away_score
    const awayGoals = sameOrder ? found.away_score : found.home_score

    await supabaseAdmin.from('matches')
      .update({ result_home: homeGoals, result_away: awayGoals }).eq('id', match.id)

    const { data: preds } = await supabaseAdmin
      .from('predictions').select('*').eq('match_id', match.id)
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

    sincronizados.push(`${match.home} ${homeGoals}-${awayGoals} ${match.away}`)
  }

  return NextResponse.json({ ok: true, sincronizados: sincronizados.length, detalle: sincronizados })
}
