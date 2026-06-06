import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Player = {
  id: string
  name: string
  emoji: string
  created_at: string
}

export type Match = {
  id: string
  home: string
  away: string
  phase: string
  match_date: string | null
  home_ranking: number | null
  away_ranking: number | null
  underdog: 'home' | 'away' | null
  result_home: number | null
  result_away: number | null
  created_at: string
}

export type Prediction = {
  id: string
  player_id: string
  match_id: string
  picked_team: 'home' | 'away' | 'draw'
  home_goals: number | null
  away_goals: number | null
  points_earned: number | null
}

export type GlobalBet = {
  id: string
  player_id: string
  champion: string | null
  scorer: string | null
  keeper: string | null
  mvp: string | null
  points_earned: number | null
}

export type Config = {
  id: number
  champion_pts: number
  scorer_pts: number
  keeper_pts: number
  mvp_pts: number
  exact_score_pts: number
  winner_only_pts: number
  draw_exact_pts: number
  draw_only_pts: number
  ud_exact_score_pts: number
  ud_winner_only_pts: number
  ud_draw_exact_pts: number
  ud_draw_only_pts: number
}
