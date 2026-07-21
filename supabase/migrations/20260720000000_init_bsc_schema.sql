-- ============================================================================
-- BSC (BOX CRICKET SCORE COUNTER) - COMPLETE PRODUCTION SETUP (NO SEED DATA)
-- File: supabase/migrations/20260720000000_init_bsc_schema.sql
-- ============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLE: matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    tournament_name VARCHAR(100) NOT NULL DEFAULT 'Box Cricket League',
    match_name VARCHAR(100) NOT NULL DEFAULT 'Match 1',
    ground VARCHAR(100) NOT NULL DEFAULT 'Turf Ground',
    team_a VARCHAR(100) NOT NULL,
    team_b VARCHAR(100) NOT NULL,
    total_overs INT NOT NULL DEFAULT 5,
    toss_winner VARCHAR(100),
    toss_decision VARCHAR(10) CHECK (toss_decision IN ('bat', 'bowl')),
    batting_team VARCHAR(100) NOT NULL,
    bowling_team VARCHAR(100) NOT NULL,
    current_innings INT NOT NULL DEFAULT 1 CHECK (current_innings IN (1, 2)),
    status VARCHAR(20) NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'finished')),
    
    score_a INT NOT NULL DEFAULT 0,
    wickets_a INT NOT NULL DEFAULT 0,
    overs_a NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    legal_balls_a INT NOT NULL DEFAULT 0,

    score_b INT NOT NULL DEFAULT 0,
    wickets_b INT NOT NULL DEFAULT 0,
    overs_b NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    legal_balls_b INT NOT NULL DEFAULT 0,
    
    target_runs INT,
    
    striker_name VARCHAR(100) NOT NULL DEFAULT 'Batsman 1',
    striker_runs INT NOT NULL DEFAULT 0,
    striker_balls INT NOT NULL DEFAULT 0,
    non_striker_name VARCHAR(100) NOT NULL DEFAULT 'Batsman 2',
    non_striker_runs INT NOT NULL DEFAULT 0,
    non_striker_balls INT NOT NULL DEFAULT 0,
    
    bowler_name VARCHAR(100) NOT NULL DEFAULT 'Bowler 1',
    bowler_overs NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    bowler_runs INT NOT NULL DEFAULT 0,
    bowler_wickets INT NOT NULL DEFAULT 0,

    result_summary VARCHAR(255),
    winner_team VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE TABLE: ball_events
CREATE TABLE IF NOT EXISTS public.ball_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    room_code VARCHAR(10) NOT NULL,
    innings INT NOT NULL CHECK (innings IN (1, 2)),
    over_number INT NOT NULL,
    ball_number INT NOT NULL,
    runs INT NOT NULL DEFAULT 0,
    extras_type VARCHAR(20) CHECK (extras_type IN ('wide', 'no_ball', 'bye', 'leg_bye')),
    extras_runs INT NOT NULL DEFAULT 0,
    event_type VARCHAR(30),
    is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
    wicket_type VARCHAR(30),
    batsman_name VARCHAR(100) NOT NULL,
    bowler_name VARCHAR(100) NOT NULL,
    commentary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE TABLE: over_summary
CREATE TABLE IF NOT EXISTS public.over_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    room_code VARCHAR(10) NOT NULL,
    over_number INT NOT NULL,
    bowler_name VARCHAR(100) NOT NULL,
    runs INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    ball_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATE TABLE: spectators
CREATE TABLE IF NOT EXISTS public.spectators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON public.matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at);

CREATE INDEX IF NOT EXISTS idx_ball_events_match_id ON public.ball_events(match_id);
CREATE INDEX IF NOT EXISTS idx_ball_events_room_code ON public.ball_events(room_code);
CREATE INDEX IF NOT EXISTS idx_ball_events_created_at ON public.ball_events(created_at);

CREATE INDEX IF NOT EXISTS idx_over_summary_match_id ON public.over_summary(match_id);
CREATE INDEX IF NOT EXISTS idx_over_summary_room_code ON public.over_summary(room_code);

CREATE INDEX IF NOT EXISTS idx_spectators_room_code ON public.spectators(room_code);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.over_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spectators ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public select matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Allow public select ball_events" ON public.ball_events FOR SELECT USING (true);
CREATE POLICY "Allow public select over_summary" ON public.over_summary FOR SELECT USING (true);
CREATE POLICY "Allow public select spectators" ON public.spectators FOR SELECT USING (true);

-- Public insert/update/delete policies WITH CHECK (true)
CREATE POLICY "Allow public all matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all ball_events" ON public.ball_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all over_summary" ON public.over_summary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all spectators" ON public.spectators FOR ALL USING (true) WITH CHECK (true);

-- 8. REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ball_events;

-- ============================================================================
-- NO SEED DATA
-- ============================================================================
-- This application uses realtime live scoring.
-- Matches are created by the umpire through the application.
-- Ball events are inserted only during live scoring.
-- No sample or dummy data is inserted.
-- Database starts empty.
