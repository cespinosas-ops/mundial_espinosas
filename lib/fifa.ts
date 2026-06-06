// FIFA ranking data - cached in memory to avoid hammering their API
// Rankings as of April 2026 (updated manually from FIFA.com)
// The mundial starts June 11 2026, rankings won't change before then

const FIFA_RANKINGS: Record<string, number> = {
  // Top 50 teams at the 2026 World Cup
  'France': 1,
  'Spain': 2,
  'Argentina': 3,
  'England': 4,
  'Portugal': 5,
  'Brazil': 6,
  'Netherlands': 7,
  'Morocco': 8,
  'Belgium': 9,
  'Germany': 10,
  'Croatia': 11,
  'Italy': 12,
  'Colombia': 13,
  'Senegal': 14,
  'Mexico': 15,
  'United States': 16,
  'USA': 16,
  'Uruguay': 17,
  'Japan': 18,
  'Switzerland': 19,
  'Denmark': 20,
  'Ecuador': 21,
  'Iran': 22,
  'Austria': 23,
  'Turkey': 24,
  'South Korea': 25,
  'Korea Republic': 25,
  'Australia': 26,
  'Hungary': 27,
  'Ukraine': 28,
  'Serbia': 29,
  'Poland': 30,
  'Czech Republic': 31,
  'Czechia': 31,
  'Chile': 32,
  'Romania': 33,
  'Algeria': 34,
  'Paraguay': 35,
  'Venezuela': 36,
  'Slovakia': 37,
  'Egypt': 38,
  'Peru': 39,
  'Norway': 40,
  'Scotland': 41,
  'Tunisia': 42,
  'Cameroon': 43,
  'Bolivia': 44,
  'Nigeria': 45,
  'Qatar': 46,
  'Saudi Arabia': 47,
  'Panama': 48,
  'Costa Rica': 49,
  'Jamaica': 50,
  'South Africa': 51,
  'Côte d\'Ivoire': 52,
  'Ivory Coast': 52,
  'Mali': 53,
  'Ghana': 54,
  'Honduras': 55,
  'Canada': 56,
  'Albania': 57,
  'New Zealand': 58,
  'Guatemala': 59,
  'Trinidad and Tobago': 60,
  'El Salvador': 61,
  'Cuba': 62,
  'Haiti': 63,
  'Kenya': 64,
  'Tanzania': 65,
  'Uganda': 66,
  'Zimbabwe': 67,
  'Zambia': 68,
  'Angola': 69,
  'Mozambique': 70,
}

export function getFifaRanking(teamName: string): number | null {
  // Try exact match first
  if (FIFA_RANKINGS[teamName] !== undefined) return FIFA_RANKINGS[teamName]
  // Try case-insensitive
  const lower = teamName.toLowerCase()
  for (const [key, val] of Object.entries(FIFA_RANKINGS)) {
    if (key.toLowerCase() === lower) return val
  }
  return null
}

export function determineUnderdog(
  homeTeam: string,
  awayTeam: string
): { underdog: 'home' | 'away' | null; homeRanking: number | null; awayRanking: number | null } {
  const homeRanking = getFifaRanking(homeTeam)
  const awayRanking = getFifaRanking(awayTeam)

  if (homeRanking === null || awayRanking === null) {
    return { underdog: null, homeRanking, awayRanking }
  }

  // Higher number = worse ranking = underdog
  const underdog = homeRanking > awayRanking ? 'home' : 'away'
  return { underdog, homeRanking, awayRanking }
}

export function calculateMatchPoints(
  prediction: { picked_team: 'home' | 'away' | 'draw'; home_goals: number | null; away_goals: number | null },
  result: { home: number; away: number },
  underdog: 'home' | 'away' | null,
  config: {
    exact_score_pts: number; winner_only_pts: number; draw_exact_pts: number; draw_only_pts: number
    ud_exact_score_pts: number; ud_winner_only_pts: number; ud_draw_exact_pts: number; ud_draw_only_pts: number
  }
): number {
  const actualWinner: 'home' | 'away' | 'draw' =
    result.home > result.away ? 'home' : result.away > result.home ? 'away' : 'draw'

  const picked = prediction.picked_team
  if (picked !== actualWinner) return 0

  const isUdPick = underdog !== null && picked === underdog
  const hasScore = prediction.home_goals !== null && prediction.away_goals !== null
  const scoreExact =
    hasScore &&
    prediction.home_goals === result.home &&
    prediction.away_goals === result.away

  if (actualWinner === 'draw') {
    if (scoreExact) return isUdPick ? config.ud_draw_exact_pts : config.draw_exact_pts
    return isUdPick ? config.ud_draw_only_pts : config.draw_only_pts
  } else {
    if (scoreExact) return isUdPick ? config.ud_exact_score_pts : config.exact_score_pts
    return isUdPick ? config.ud_winner_only_pts : config.winner_only_pts
  }
}
