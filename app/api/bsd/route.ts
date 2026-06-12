import { NextResponse } from 'next/server'

const TOKEN = process.env.BSD_TOKEN || '632069d193292b249c4e6947e6c9b17c1efc4e44'
const BASE = 'https://sports.bzzoiro.com'
const LEAGUE = 27 // World Cup 2026

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
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Token ${TOKEN}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`bsd ${res.status}`)
  return res.json()
}

async function allMatches() {
  const out: any[] = []
  let page = 1
  while (page <= 8) {
    const data = await bsd(`/api/matches/?league=${LEAGUE}&date_from=2026-06-01&date_to=2026-07-31&page=${page}`)
    out.push(...(data.results || []))
    if (!data.next) break
    page++
  }
  return out
}

function trimPlayer(p: any) {
  return {
    name: p.name,
    number: p.jersey_number,
    position: p.position,
    rating: p.rating,
    goals: p.goals,
    yellow: p.yellow_card,
    red: p.red_card,
    subIn: p.sub_in,
    subOut: p.sub_out,
    playerId: p.player_id,
    replacedBy: p.replaced_by_player_id,
    replaces: p.replaces_player_id,
  }
}

function pctNum(v: any): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const m = v.match(/(\d+)/)
    if (m) return parseInt(m[1])
  }
  return null
}

function extractStats(ls: any) {
  const h = ls.home || {}, a = ls.away || {}
  const rows = [
    { key: 'ball_possession', label: 'Posesión', pct: true },
    { key: 'total_shots', label: 'Tiros totales' },
    { key: 'shots_on_target', label: 'Tiros al arco' },
    { key: 'expected_goals', label: 'xG' },
    { key: 'big_chances', label: 'Ocasiones claras' },
    { key: 'corner_kicks', label: 'Córners' },
    { key: 'passes', label: 'Pases' },
    { key: 'fouls', label: 'Faltas' },
    { key: 'yellow_cards', label: 'Amarillas' },
  ]
  return rows
    .filter(r => h[r.key] != null || a[r.key] != null)
    .map(r => ({
      label: r.label,
      home: typeof h[r.key] === 'number' ? h[r.key] : pctNum(h[r.key]),
      away: typeof a[r.key] === 'number' ? a[r.key] : pctNum(a[r.key]),
      pct: !!r.pct,
    }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    if (type === 'find') {
      const home = norm(searchParams.get('home') || '')
      const away = norm(searchParams.get('away') || '')
      const matches = await allMatches()
      const found = matches.find(m => {
        const h = norm(m.home_team), a = norm(m.away_team)
        return (h === home && a === away) || (h === away && a === home)
      })
      if (!found) return NextResponse.json({ error: 'no encontrado' }, { status: 404 })

      const det = await bsd(`/api/matches/${found.id}/`)
      const lineups = det.lineups || null

      return NextResponse.json({
        id: det.id,
        home: det.home_team,
        away: det.away_team,
        date: det.event_date,
        status: det.status,
        minute: det.current_minute,
        homeScore: det.home_score,
        awayScore: det.away_score,
        homeXg: det.actual_home_xg ?? det.home_xg_live,
        awayXg: det.actual_away_xg ?? det.away_xg_live,
        venue: det.venue?.name || det.venue || null,
        referee: det.referee?.name || det.referee || null,
        attendance: det.attendance,
        odds: { home: det.odds_home, draw: det.odds_draw, away: det.odds_away, over25: det.odds_over_25, btts: det.odds_btts_yes },
        homeCoach: det.home_coach?.name || null,
        awayCoach: det.away_coach?.name || null,
        homeForm: det.home_form ? {
          form: det.home_form.form_string,
          gf: det.home_form.goals_scored_last_n,
          gc: det.home_form.goals_conceded_last_n,
          avgXg: det.home_form.avg_xg,
          avgXgC: det.home_form.avg_xg_conceded,
        } : null,
        awayForm: det.away_form ? {
          form: det.away_form.form_string,
          gf: det.away_form.goals_scored_last_n,
          gc: det.away_form.goals_conceded_last_n,
          avgXg: det.away_form.avg_xg,
          avgXgC: det.away_form.avg_xg_conceded,
        } : null,
        unavailable: det.unavailable_players || null,
        liveStats: det.live_stats ? extractStats(det.live_stats) : null,
        minutePlayed: det.current_minute,
        lineups: lineups ? {
          home: { players: (lineups.home?.players || []).map(trimPlayer), substitutes: (lineups.home?.substitutes || []).map(trimPlayer), formation: lineups.home?.formation || null },
          away: { players: (lineups.away?.players || []).map(trimPlayer), substitutes: (lineups.away?.substitutes || []).map(trimPlayer), formation: lineups.away?.formation || null },
        } : null,
      })
    }

    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
