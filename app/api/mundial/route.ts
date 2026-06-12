import { NextResponse } from 'next/server'

const TOKEN = process.env.FOOTBALL_DATA_TOKEN || '5f2a6dcbd7bc46e7b26affc238755223'
const BASE = 'https://api.football-data.org/v4/competitions/WC'

export const revalidate = 60

async function fd(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': TOKEN },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`football-data ${res.status}`)
  return res.json()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    if (type === 'standings') {
      const data = await fd('/standings')
      const groups = (data.standings || []).map((s: any) => ({
        group: s.group,
        table: (s.table || []).map((r: any) => ({
          position: r.position,
          team: r.team?.name,
          tla: r.team?.tla,
          crest: r.team?.crest,
          played: r.playedGames,
          won: r.won,
          draw: r.draw,
          lost: r.lost,
          gf: r.goalsFor,
          ga: r.goalsAgainst,
          gd: r.goalDifference,
          points: r.points,
        })),
      }))
      return NextResponse.json({ groups })
    }

    if (type === 'scorers') {
      const data = await fd('/scorers?limit=20')
      const scorers = (data.scorers || []).map((s: any) => ({
        name: s.player?.name,
        nationality: s.player?.nationality,
        team: s.team?.name,
        crest: s.team?.crest,
        goals: s.goals || 0,
        assists: s.assists || 0,
        penalties: s.penalties || 0,
        played: s.playedMatches || 0,
      }))
      return NextResponse.json({ scorers })
    }

    if (type === 'matches') {
      const data = await fd('/matches')
      const matches = (data.matches || []).map((m: any) => ({
        id: m.id,
        utcDate: m.utcDate,
        status: m.status,
        matchday: m.matchday,
        stage: m.stage,
        group: m.group,
        home: m.homeTeam?.name,
        homeTla: m.homeTeam?.tla,
        homeCrest: m.homeTeam?.crest,
        away: m.awayTeam?.name,
        awayTla: m.awayTeam?.tla,
        awayCrest: m.awayTeam?.crest,
        homeGoals: m.score?.fullTime?.home,
        awayGoals: m.score?.fullTime?.away,
      }))
      return NextResponse.json({ matches })
    }

    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
