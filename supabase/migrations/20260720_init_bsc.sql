-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  tournament_name TEXT,
  match_name TEXT,
  ground TEXT,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  total_overs INT NOT NULL DEFAULT 5,
  toss_winner TEXT NOT NULL,
  toss_decision TEXT NOT NULL, -- 'bat' or 'bowl'
  batting_team TEXT NOT NULL,
  bowling_team TEXT NOT NULL,
  current_innings INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'live', -- 'live', 'finished'
  
  -- Scores First Innings
  score_a INT DEFAULT 0,
  wickets_a INT DEFAULT 0,
  overs_a NUMERIC(4,1) DEFAULT 0.0,
  legal_balls_a INT DEFAULT 0,
  
  -- Scores Second Innings
  score_b INT DEFAULT 0,
  wickets_b INT DEFAULT 0,
  overs_b NUMERIC(4,1) DEFAULT 0.0,
  legal_balls_b INT DEFAULT 0,
  
  target_runs INT,
  
  -- Active Players
  striker_name TEXT DEFAULT 'Batsman 1',
  striker_runs INT DEFAULT 0,
  striker_balls INT DEFAULT 0,
  
  non_striker_name TEXT DEFAULT 'Batsman 2',
  non_striker_runs INT DEFAULT 0,
  non_striker_balls INT DEFAULT 0,
  
  bowler_name TEXT DEFAULT 'Bowler 1',
  bowler_overs NUMERIC(4,1) DEFAULT 0.0,
  bowler_runs INT DEFAULT 0,
  bowler_wickets INT DEFAULT 0,
  bowler_legal_balls INT DEFAULT 0,
  
  result_summary TEXT,
  winner_team TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ball Events Table
CREATE TABLE IF NOT EXISTS public.ball_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  room_code VARCHAR(10) NOT NULL,
  innings INT NOT NULL DEFAULT 1,
  over_number INT NOT NULL DEFAULT 0,
  ball_number INT NOT NULL DEFAULT 1,
  batsman_name TEXT NOT NULL,
  bowler_name TEXT NOT NULL,
  runs_scored INT DEFAULT 0,
  extras_type TEXT, -- 'wide', 'no_ball', 'bye', 'leg_bye'
  extras_runs INT DEFAULT 0,
  total_ball_runs INT DEFAULT 0,
  is_legal_delivery BOOLEAN DEFAULT true,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type TEXT, -- 'bowled', 'caught', 'run_out', 'lbw', 'stumped', 'hit_wicket', 'retired_out'
  wicket_batsman TEXT,
  commentary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for match creation & live scoring
CREATE POLICY "Allow public read for matches" ON public.matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert for matches" ON public.matches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update for matches" ON public.matches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for ball_events" ON public.ball_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert for ball_events" ON public.ball_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update for ball_events" ON public.ball_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for ball_events" ON public.ball_events FOR DELETE TO anon, authenticated USING (true);

-- Enable Realtime for matches and ball_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_events;
