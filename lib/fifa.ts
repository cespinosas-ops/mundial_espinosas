
const FIFA_RANKINGS: Record<string, number> = {
  // Ranking FIFA oficial del 11 de junio de 2026 (ultimo antes del Mundial).
  // Claves con los nombres de BSD y variantes/alias para matchear siempre.
  'Argentina': 1,
  'Spain': 2,
  'France': 3,
  'England': 4,
  'Portugal': 5,
  'Brazil': 6,
  'Morocco': 7,
  'Netherlands': 8,
  'Belgium': 9,
  'Germany': 10,
  'Croatia': 11,
  'Italy': 12,
  'Colombia': 13,
  'Mexico': 14,
  'Senegal': 15,
  'Uruguay': 16,
  'USA': 17,
  'United States': 17,
  'Japan': 18,
  'Switzerland': 19,
  'Iran': 20,
  'IR Iran': 20,
  'Denmark': 21,
  'Turkey': 22,
  'Türkiye': 22,
  'Turkiye': 22,
  'Ecuador': 23,
  'Austria': 24,
  'South Korea': 25,
  'Korea Republic': 25,
  'Nigeria': 26,
  'Australia': 27,
  'Algeria': 28,
  'Egypt': 29,
  'Canada': 30,
  'Norway': 31,
  'Ukraine': 32,
  'Côte d\'Ivoire': 33,
  'Ivory Coast': 33,
  'Panama': 34,
  'Russia': 35,
  'Poland': 36,
  'Wales': 37,
  'Sweden': 38,
  'Hungary': 39,
  'Czechia': 40,
  'Czech Republic': 40,
  'Paraguay': 41,
  'Scotland': 42,
  'Serbia': 43,
  'Cameroon': 44,
  'Tunisia': 45,
  'DR Congo': 46,
  'Congo DR': 46,
  'Slovakia': 47,
  'Greece': 48,
  'Venezuela': 49,
  'Uzbekistan': 50,
  'Chile': 51,
  'Peru': 52,
  'Costa Rica': 53,
  'Romania': 54,
  'Mali': 55,
  'Qatar': 56,
  'Iraq': 57,
  'Ireland': 58,
  'Republic of Ireland': 58,
  'Slovenia': 59,
  'South Africa': 60,
  'Saudi Arabia': 61,
  'Burkina Faso': 62,
  'Jordan': 63,
  'Bosnia & Herzegovina': 64,
  'Bosnia and Herzegovina': 64,
  'Honduras': 65,
  'Albania': 66,
  'Cabo Verde': 67,
  'Cape Verde': 67,
  'United Arab Emirates': 68,
  'UAE': 68,
  'North Macedonia': 69,
  'Northern Ireland': 70,
  'Jamaica': 71,
  'Georgia': 72,
  'Ghana': 73,
  'Iceland': 74,
  'Finland': 75,
  'Israel': 76,
  'Bolivia': 77,
  'Kosovo': 78,
  'Oman': 79,
  'Montenegro': 80,
  'Guinea': 81,
  'Curaçao': 82,
  'Curacao': 82,
  'Haiti': 83,
  'Syria': 84,
  'New Zealand': 85,
  'Gabon': 86,
  'Bulgaria': 87,
  'Angola': 88,
  'Uganda': 89,
  'Zambia': 90,
  'China': 91,
  'China PR': 91,
  'Bahrain': 92,
  'Benin': 93,
  'Thailand': 94,
  'Palestine': 95,
  'Belarus': 96,
  'Guatemala': 97,
  'Luxembourg': 98,
  'Vietnam': 99,
  'El Salvador': 100,
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
