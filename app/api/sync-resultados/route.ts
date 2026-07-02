import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { calculateMatchPoints, determineUnderdog } from '@/lib/fifa'

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
  'cote divoire': 'ivory coast',
  'congo dr': 'dr congo',
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
  // BSD ignora ?page (siempre devuelve offset 0). La paginacion real es por
  // limit/offset, asi que recorremos en bloques de 50 y deduplicamos por id.
  const seen = new Set<number>()
  const out: any[] = []
  for (let offset = 0; offset < 600; offset += 50) {
    let data: any
    try {
      data = await bsd(`/api/matches/?league=${LEAGUE}&date_from=2026-06-01&date_to=2026-07-31&limit=50&offset=${offset}`)
    } catch { break }
    const res = data.results || []
    if (!res.length) break
    let added = 0
    for (const m of res) {
      if (!seen.has(m.id)) { seen.add(m.id); out.push(m); added++ }
    }
    if (added === 0) break
    if (res.length < 50) break
  }
  return out
}

const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || '5f2a6dcbd7bc46e7b26affc238755223'
const STAGE_TO_PHASE: Record<string, string> = {
  LAST_32: 'Dieciseisavos',
  LAST_16: 'Octavos',
  QUARTER_FINALS: 'Cuartos',
  SEMI_FINALS: 'Semis',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
}

const KNOCKOUT_PHASES = new Set<string>(Object.values(STAGE_TO_PHASE))

// Trae los partidos del Mundial desde football-data (una sola vez por corrida).
async function fetchFdMatches(): Promise<any[]> {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': FD_TOKEN }, next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.matches || []
  } catch { return [] }
}

// Resultado a los 90' desde football-data: si hubo alargue/penales usa regularTime.
function fd90(score: any): { home: number; away: number } | null {
  if (!score) return null
  // 1) regularTime si viene poblado (caso penales: Germany 1-1)
  const rt = score.regularTime
  if (rt && rt.home != null && rt.away != null) return { home: rt.home, away: rt.away }
  const ft = score.fullTime
  if (!ft || ft.home == null || ft.away == null) return null
  // 2) regularTime null pero hubo alargue -> 90' = fullTime - extraTime (caso Belgium 3-2 -> 2-2)
  const et = score.extraTime
  if (et && et.home != null && et.away != null) {
    return { home: ft.home - et.home, away: ft.away - et.away }
  }
  // 3) partido normal
  return { home: ft.home, away: ft.away }
}

// Crea en la tabla los partidos de eliminatoria que football-data ya tenga definidos
// (equipos reales, no placeholders). Idempotente: deduplica por el par de equipos.
async function autoPopulateKnockout(supabaseAdmin: any, fdMatches: any[]): Promise<string[]> {
  const { data: existing } = await supabaseAdmin.from('matches').select('home, away')
  const have = new Set<string>((existing || []).map((m: any) => [norm(m.home), norm(m.away)].sort().join('|')))

  const inserted: string[] = []
  for (const m of fdMatches) {
    const phase = STAGE_TO_PHASE[m.stage as string]
    if (!phase) continue
    const h: string | undefined = m.homeTeam?.name
    const a: string | undefined = m.awayTeam?.name
    if (!h || !a) continue // cruce todavia sin definir
    const key = [norm(h), norm(a)].sort().join('|')
    if (have.has(key)) continue
    const { underdog, homeRanking, awayRanking } = determineUnderdog(h, a)
    const { error } = await supabaseAdmin.from('matches').insert({
      home: h, away: a, phase,
      match_date: m.utcDate ?? null,
      home_ranking: homeRanking, away_ranking: awayRanking,
      underdog: underdog ?? null,
    })
    if (!error) { have.add(key); inserted.push(`${h} vs ${a} (${phase})`) }
  }
  return inserted
}

export async function GET() {
  const now = Date.now()
  if (now - lastSync < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, skip: true, mensaje: 'sincronizado recientemente' })
  }
  lastSync = now

  const supabaseAdmin = getSupabaseAdmin()

  const fdMatches = await fetchFdMatches()
  const nuevos = await autoPopulateKnockout(supabaseAdmin, fdMatches)
  const fdByPair = new Map<string, any>()
  for (const m of fdMatches) {
    const fh = m.homeTeam?.name, fa = m.awayTeam?.name
    if (fh && fa) fdByPair.set([norm(fh), norm(fa)].sort().join('|'), m)
  }

  const { data: pendientes, error: pErr } = await supabaseAdmin
    .from('matches').select('*').is('result_home', null)
  if (pErr) return NextResponse.json({ error: 'error leyendo partidos' }, { status: 500 })
  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ ok: true, sincronizados: 0, nuevos: nuevos.length, fixtures: nuevos, mensaje: 'nada pendiente' })
  }

  const { data: cfgRows } = await supabaseAdmin.from('config').select('*').eq('id', 1)
  const config = cfgRows?.[0]
  if (!config) return NextResponse.json({ error: 'config no encontrada' }, { status: 500 })

  let bsdMatches: any[] = []
  try { bsdMatches = await allMatches() } catch { bsdMatches = [] }

  const sincronizados: string[] = []

  for (const match of pendientes) {
    const h = norm(match.home), a = norm(match.away)
    let homeGoals: number, awayGoals: number

    if (KNOCKOUT_PHASES.has(match.phase)) {
      // Eliminatoria -> football-data, liquidacion por los 90' (regularTime si hubo alargue/penales)
      const fm = fdByPair.get([h, a].sort().join('|'))
      if (!fm || fm.status !== 'FINISHED') continue
      const board = fd90(fm.score)
      if (!board) continue
      const sameOrder = norm(fm.homeTeam?.name) === h
      homeGoals = sameOrder ? board.home : board.away
      awayGoals = sameOrder ? board.away : board.home
    } else {
      // Grupos -> BSD
      const found = bsdMatches.find((m: any) => {
        const bh = norm(m.home_team), ba = norm(m.away_team)
        return (bh === h && ba === a) || (bh === a && ba === h)
      })
      if (!found) continue
      if (found.status !== 'finished') continue
      if (found.home_score == null || found.away_score == null) continue
      const sameOrder = norm(found.home_team) === h
      homeGoals = sameOrder ? found.home_score : found.away_score
      awayGoals = sameOrder ? found.away_score : found.home_score
    }

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

  return NextResponse.json({ ok: true, nuevos: nuevos.length, fixtures: nuevos, sincronizados: sincronizados.length, detalle: sincronizados })
}
