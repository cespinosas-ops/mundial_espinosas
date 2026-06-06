-- Run this in your Supabase SQL editor to set up the database

-- Players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '👤',
  created_at timestamptz default now()
);

-- Matches table
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  home text not null,
  away text not null,
  phase text not null default 'Grupos',
  match_date timestamptz,
  home_ranking int,
  away_ranking int,
  underdog text check (underdog in ('home', 'away')),
  result_home int,
  result_away int,
  created_at timestamptz default now()
);

-- Predictions table
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  picked_team text not null check (picked_team in ('home', 'away', 'draw')),
  home_goals int,
  away_goals int,
  points_earned int default 0,
  unique(player_id, match_id)
);

-- Global bets table (one row per player)
create table if not exists global_bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade unique,
  champion text,
  scorer text,
  keeper text,
  mvp text,
  points_earned int default 0
);

-- Config table (single row)
create table if not exists config (
  id int primary key default 1,
  champion_pts int default 20,
  scorer_pts int default 15,
  keeper_pts int default 10,
  mvp_pts int default 10,
  exact_score_pts int default 5,
  winner_only_pts int default 2,
  draw_exact_pts int default 5,
  draw_only_pts int default 2,
  ud_exact_score_pts int default 10,
  ud_winner_only_pts int default 5,
  ud_draw_exact_pts int default 8,
  ud_draw_only_pts int default 4
);

-- Insert default config
insert into config (id) values (1) on conflict (id) do nothing;

-- Enable Row Level Security (RLS) and allow all for simplicity
-- In production you'd want proper auth
alter table players enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table global_bets enable row level security;
alter table config enable row level security;

create policy "public read" on players for select using (true);
create policy "public write" on players for all using (true);
create policy "public read" on matches for select using (true);
create policy "public write" on matches for all using (true);
create policy "public read" on predictions for select using (true);
create policy "public write" on predictions for all using (true);
create policy "public read" on global_bets for select using (true);
create policy "public write" on global_bets for all using (true);
create policy "public read" on config for select using (true);
create policy "public write" on config for all using (true);
