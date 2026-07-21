import { createClient } from '@supabase/supabase-js';
import type { MatchData, BallEvent } from '../types';

// Read Environment Variables
let rawUrl = import.meta.env.VITE_SUPABASE_URL;
let anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback / Normalization if needed
if (rawUrl && rawUrl.includes('db.')) {
  rawUrl = rawUrl.replace('db.', '');
}
const supabaseUrl = (rawUrl || 'https://dzkocpkdsdcxhyqlkaoa.supabase.co').replace(/\/$/, '');
const supabaseAnonKey = anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6a29jcGtkc2RjeGh5cWxrYW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjAyNDIsImV4cCI6MjEwMDA5NjI0Mn0.I_eGM_PuQi7UAxXkIXSM8OVGNWJRdidr8ZzU6uEKg1E';

const isPlaceholderKey = supabaseAnonKey.includes('dummyKey') || supabaseAnonKey === 'YOUR_SUPABASE_PUBLISHABLE_KEY';

// Startup Environment Verification Logs
console.log("Supabase URL:", supabaseUrl ? `Loaded (${supabaseUrl})` : "Missing");
if (isPlaceholderKey) {
  console.warn("Supabase Key: Placeholder Key Detected (.dummyKey). Replace VITE_SUPABASE_ANON_KEY in .env with your real key from Supabase Dashboard -> Settings -> API.");
} else {
  console.log("Supabase Key: Loaded");
}

if (!supabaseUrl) {
  throw new Error("Supabase URL is missing! Check VITE_SUPABASE_URL in .env");
}

if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is missing! Check VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MATCH_KEY_PREFIX = 'bsc_match_';
const HISTORY_KEY = 'bsc_match_history';

// BroadcastChannel fallback for sub-50ms local tab sync
const localBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('bsc_live_channel')
  : null;

/**
 * Generate standard RFC4122 v4 UUID for Postgres UUID columns
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to ensure string ID is a valid Postgres UUID
 */
function ensureUUID(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return generateUUID();
}

/**
 * Generate 6-character uppercase Room Code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BSC';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * STEP 2: Create Match in Supabase
 * Directly INSERT INTO public.matches, return created match id and verified data
 */
export async function createMatchInSupabase(match: MatchData): Promise<MatchData> {
  const validId = ensureUUID(match.id);
  match.id = validId;

  console.log('Creating Match in Supabase... Match ID:', validId);

  const row = {
    id: validId,
    room_code: match.roomCode.toUpperCase().trim(),
    tournament_name: match.tournamentName,
    match_name: match.matchName,
    ground: match.ground,
    team_a: match.teamA,
    team_b: match.teamB,
    total_overs: match.totalOvers,
    toss_winner: match.tossWinner,
    toss_decision: match.tossDecision,
    batting_team: match.battingTeam,
    bowling_team: match.bowlingTeam,
    current_innings: match.currentInnings,
    status: match.status || 'live',
    score_a: match.scoreA || 0,
    wickets_a: match.wicketsA || 0,
    overs_a: match.oversA || 0,
    legal_balls_a: match.legalBallsA || 0,
    score_b: match.scoreB || 0,
    wickets_b: match.wicketsB || 0,
    overs_b: match.oversB || 0,
    legal_balls_b: match.legalBallsB || 0,
    target_runs: match.targetRuns || null,
    striker_name: match.strikerName,
    striker_runs: match.strikerRuns || 0,
    striker_balls: match.strikerBalls || 0,
    non_striker_name: match.nonStrikerName,
    non_striker_runs: match.nonStrikerRuns || 0,
    non_striker_balls: match.nonStrikerBalls || 0,
    bowler_name: match.bowlerName,
    bowler_overs: match.bowlerOvers || 0,
    bowler_runs: match.bowlerRuns || 0,
    bowler_wickets: match.bowlerWickets || 0,
    result_summary: match.resultSummary || null,
    winner_team: match.winnerTeam || null,
    created_at: new Date(match.createdAt || Date.now()).toISOString(),
    updated_at: new Date(match.updatedAt || Date.now()).toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('matches')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('SUPABASE CREATE MATCH ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('Match Insert Success!');
      console.log('Inserted Match ID:', data.id, 'Room Code:', data.room_code);
    }
  } catch (err) {
    console.error('Exception creating match in Supabase:', err);
  }

  // Save to local storage for offline fallback
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MATCH_KEY_PREFIX + match.roomCode, JSON.stringify(match));
    localStorage.setItem('bsc_current_match_code', match.roomCode);
  }

  return match;
}

/**
 * STEP 3: Save Ball Event & Update Match Row
 * Maps exact column names from public.ball_events schema DDL:
 * (match_id, room_code, innings, over_number, ball_number, runs, extras_type, extras_runs, event_type, is_wicket, wicket_type, batsman_name, bowler_name, commentary, created_at)
 */
export async function saveBallEvent(matchId: string, roomCode: string, ballEvent: BallEvent): Promise<void> {
  console.log('Saving Ball...', ballEvent);
  const validMatchId = ensureUUID(matchId);
  const validBallId = ensureUUID(ballEvent.id);

  const row = {
    id: validBallId,
    match_id: validMatchId,
    room_code: roomCode.toUpperCase().trim(),
    innings: ballEvent.innings,
    over_number: ballEvent.overNumber,
    ball_number: ballEvent.ballNumber,
    runs: ballEvent.runsScored,
    extras_type: ballEvent.extrasType || null,
    extras_runs: ballEvent.extrasRuns || 0,
    event_type: ballEvent.isWicket ? 'WICKET' : (ballEvent.extrasType || 'RUNS'),
    is_wicket: ballEvent.isWicket || false,
    wicket_type: ballEvent.wicketType || null,
    batsman_name: ballEvent.batsmanName,
    bowler_name: ballEvent.bowlerName,
    commentary: ballEvent.commentaryText || null,
    created_at: new Date(ballEvent.timestamp || Date.now()).toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('ball_events')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('SUPABASE BALL EVENT INSERT ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('Ball Saved:', data?.id);
    }
  } catch (err) {
    console.error('Exception inserting ball event into Supabase:', err);
  }
}

/**
 * Save / Update Over Summary in public.over_summary table
 */
export async function saveOverSummary(
  matchId: string, 
  roomCode: string, 
  overNumber: number, 
  bowlerName: string, 
  runs: number, 
  wickets: number, 
  ballSequence: string[]
): Promise<void> {
  const validMatchId = ensureUUID(matchId);
  const code = roomCode.toUpperCase().trim();
  console.log(`Saving Over Summary for Over ${overNumber + 1}...`);

  const row = {
    id: generateUUID(),
    match_id: validMatchId,
    room_code: code,
    over_number: overNumber,
    bowler_name: bowlerName,
    runs: runs,
    wickets: wickets,
    ball_sequence: ballSequence,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('over_summary')
      .upsert([row])
      .select()
      .single();

    if (error) {
      console.error('SUPABASE OVER SUMMARY INSERT ERROR:', error.message, error.details);
    } else {
      console.log('Over Summary Saved:', data?.id, `Over ${overNumber + 1}: ${runs} runs, ${wickets} wkts`);
    }
  } catch (err) {
    console.error('Exception saving over summary to Supabase:', err);
  }
}

/**
 * Fetch Over Summaries from public.over_summary table
 */
export async function getOverSummaries(roomCode: string) {
  const code = roomCode.toUpperCase().trim();
  try {
    const { data, error } = await supabase
      .from('over_summary')
      .select('*')
      .eq('room_code', code)
      .order('over_number', { ascending: true });

    if (error) console.error('Error fetching over summaries:', error.message);
    return data || [];
  } catch (err) {
    console.error('Exception fetching over summaries:', err);
    return [];
  }
}

/**
 * Update Match Cumulative Score in Supabase
 */
export async function saveMatchState(match: MatchData): Promise<void> {
  const validId = ensureUUID(match.id);
  match.id = validId;

  console.log('Updating Match...', validId, 'Room Code:', match.roomCode);

  const row = {
    id: validId,
    room_code: match.roomCode.toUpperCase().trim(),
    tournament_name: match.tournamentName,
    match_name: match.matchName,
    ground: match.ground,
    team_a: match.teamA,
    team_b: match.teamB,
    total_overs: match.totalOvers,
    toss_winner: match.tossWinner,
    toss_decision: match.tossDecision,
    batting_team: match.battingTeam,
    bowling_team: match.bowlingTeam,
    current_innings: match.currentInnings,
    status: match.status,
    score_a: match.scoreA,
    wickets_a: match.wicketsA,
    overs_a: match.oversA,
    legal_balls_a: match.legalBallsA,
    score_b: match.scoreB,
    wickets_b: match.wicketsB,
    overs_b: match.oversB,
    legal_balls_b: match.legalBallsB,
    target_runs: match.targetRuns || null,
    striker_name: match.strikerName,
    striker_runs: match.strikerRuns,
    striker_balls: match.strikerBalls,
    non_striker_name: match.nonStrikerName,
    non_striker_runs: match.nonStrikerRuns,
    non_striker_balls: match.nonStrikerBalls,
    bowler_name: match.bowlerName,
    bowler_overs: match.bowlerOvers,
    bowler_runs: match.bowlerRuns,
    bowler_wickets: match.bowlerWickets,
    result_summary: match.resultSummary || null,
    winner_team: match.winnerTeam || null,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('matches')
      .upsert([row])
      .select()
      .single();

    if (error) {
      console.error('SUPABASE MATCH UPDATE ERROR:', error.message, error.details, error.hint);
    } else {
      console.log('Match Updated:', data?.id);
    }
  } catch (err) {
    console.error('Exception updating match in Supabase:', err);
  }

  // Local storage offline sync
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MATCH_KEY_PREFIX + match.roomCode, JSON.stringify(match));
    localStorage.setItem('bsc_current_match_code', match.roomCode);
  }
}

/**
 * STEP 4: Join Match (Query matches WHERE room_code = entered_code)
 */
export async function getMatchState(roomCode: string): Promise<MatchData | null> {
  const code = roomCode.toUpperCase().trim();
  console.log(`Querying Supabase for Room Code ${code}...`);

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('room_code', code)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('SUPABASE ROOM CODE QUERY ERROR:', error.message, error.details);
    }

    if (data && !error) {
      // Fetch ball_events for this match
      const { data: ballEventsData } = await supabase
        .from('ball_events')
        .select('*')
        .eq('room_code', code)
        .order('created_at', { ascending: false });

      const ballEvents: BallEvent[] = (ballEventsData || []).map((b: any) => ({
        id: b.id,
        matchId: b.match_id,
        roomCode: b.room_code,
        innings: b.innings,
        overNumber: b.over_number,
        ballNumber: b.ball_number,
        batsmanName: b.batsman_name || 'Batsman',
        bowlerName: b.bowler_name || 'Bowler',
        runsScored: b.runs,
        extrasType: b.extras_type,
        extrasRuns: b.extras_runs,
        totalBallRuns: b.extras_type === 'wide' || b.extras_type === 'no_ball' ? 1 + b.extras_runs : b.runs,
        isLegalDelivery: b.extras_type !== 'wide' && b.extras_type !== 'no_ball',
        isWicket: b.is_wicket,
        wicketType: b.wicket_type,
        wicketBatsman: b.is_wicket ? b.batsman_name : undefined,
        commentaryText: b.commentary || `${b.bowler_name} to ${b.batsman_name}, ${b.runs} runs`,
        timestamp: new Date(b.created_at || Date.now()).getTime()
      }));

      const match: MatchData = {
        id: data.id,
        roomCode: data.room_code,
        tournamentName: data.tournament_name,
        matchName: data.match_name,
        ground: data.ground,
        teamA: data.team_a,
        teamB: data.team_b,
        totalOvers: data.total_overs,
        tossWinner: data.toss_winner,
        tossDecision: data.toss_decision,
        battingTeam: data.batting_team,
        bowlingTeam: data.bowling_team,
        currentInnings: data.current_innings,
        status: data.status,
        scoreA: data.score_a,
        wicketsA: data.wickets_a,
        oversA: data.overs_a,
        legalBallsA: data.legal_balls_a,
        scoreB: data.score_b,
        wicketsB: data.wickets_b,
        oversB: data.overs_b,
        legalBallsB: data.legal_balls_b,
        targetRuns: data.target_runs,
        strikerName: data.striker_name,
        strikerRuns: data.striker_runs,
        strikerBalls: data.striker_balls,
        nonStrikerName: data.non_striker_name,
        nonStrikerRuns: data.non_striker_runs,
        nonStrikerBalls: data.non_striker_balls,
        bowlerName: data.bowler_name,
        bowlerOvers: data.bowler_overs,
        bowlerRuns: data.bowler_runs,
        bowlerWickets: data.bowler_wickets,
        bowlerLegalBalls: 0,
        commentary: ballEvents.map((b) => b.commentaryText || ''),
        ballEvents: ballEvents,
        resultSummary: data.result_summary,
        winnerTeam: data.winner_team,
        createdAt: new Date(data.created_at || Date.now()).getTime(),
        updatedAt: new Date(data.updated_at || Date.now()).getTime(),
      };

      console.log('Match Found in Supabase:', match.id, match.roomCode);
      return match;
    }
  } catch (err) {
    console.error('Exception querying match state from Supabase:', err);
  }

  // Local storage offline cache fallback
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(MATCH_KEY_PREFIX + code);
    if (cached) {
      try {
        console.log('Local storage fallback match returned:', code);
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  return null;
}

/**
 * Register spectator in spectators table
 */
export async function trackSpectatorJoin(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase().trim();
  console.log(`Tracking spectator join for room ${code}...`);
  try {
    const { data, error } = await supabase.from('spectators').insert([
      { room_code: code, joined_at: new Date().toISOString() }
    ]).select();

    if (error) {
      console.error('SUPABASE SPECTATOR INSERT ERROR:', error.message, error.details);
    } else {
      console.log('Spectator Insert Success:', data);
    }
  } catch (err) {
    console.error('Spectator track exception (non-fatal):', err);
  }
}

/**
 * STEP 5: Match History (SELECT * FROM matches ORDER BY created_at DESC)
 */
export async function getMatchHistory(): Promise<MatchData[]> {
  console.log('Loading History from Supabase...');
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SUPABASE HISTORY FETCH ERROR:', error.message, error.details);
    } else if (data) {
      console.log('History Loaded:', data.length, 'matches');
      const matchesList: MatchData[] = data.map((d: any) => ({
        id: d.id,
        roomCode: d.room_code,
        tournamentName: d.tournament_name,
        matchName: d.match_name,
        ground: d.ground,
        teamA: d.team_a,
        teamB: d.team_b,
        totalOvers: d.total_overs,
        tossWinner: d.toss_winner,
        tossDecision: d.toss_decision,
        battingTeam: d.batting_team,
        bowlingTeam: d.bowling_team,
        currentInnings: d.current_innings,
        status: d.status,
        scoreA: d.score_a,
        wicketsA: d.wickets_a,
        oversA: d.overs_a,
        legalBallsA: d.legal_balls_a,
        scoreB: d.score_b,
        wicketsB: d.wickets_b,
        oversB: d.overs_b,
        legalBallsB: d.legal_balls_b,
        targetRuns: d.target_runs,
        strikerName: d.striker_name,
        strikerRuns: d.striker_runs,
        strikerBalls: d.striker_balls,
        nonStrikerName: d.non_striker_name,
        nonStrikerRuns: d.non_striker_runs,
        nonStrikerBalls: d.non_striker_balls,
        bowlerName: d.bowler_name,
        bowlerOvers: d.bowler_overs,
        bowlerRuns: d.bowler_runs,
        bowlerWickets: d.bowler_wickets,
        bowlerLegalBalls: 0,
        commentary: [],
        ballEvents: [],
        resultSummary: d.result_summary,
        winnerTeam: d.winner_team,
        createdAt: new Date(d.created_at || Date.now()).getTime(),
        updatedAt: new Date(d.updated_at || Date.now()).getTime(),
      }));

      return matchesList;
    }
  } catch (err) {
    console.error('Exception fetching match history from Supabase:', err);
  }

  // Offline fallback to local storage
  if (typeof localStorage !== 'undefined') {
    const existingHistoryJson = localStorage.getItem(HISTORY_KEY);
    if (existingHistoryJson) {
      try {
        return JSON.parse(existingHistoryJson);
      } catch (e) {}
    }
  }
  return [];
}

/**
 * Clear all match history
 */
export async function clearMatchHistory(): Promise<void> {
  console.log('Clearing Match History...');
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem('bsc_current_match_code');
  }
  try {
    const { error } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error('Supabase clear history error:', error.message);
  } catch (err) {
    console.error('Error clearing Supabase matches history:', err);
  }
}

/**
 * Delete single match by ID/RoomCode
 */
export async function deleteMatch(id: string, roomCode: string): Promise<void> {
  console.log('Deleting match from Supabase...', id, roomCode);
  if (typeof localStorage !== 'undefined') {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      try {
        const list: MatchData[] = JSON.parse(historyJson);
        const filtered = list.filter((m) => m.id !== id && m.roomCode !== roomCode);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
      } catch (e) {}
    }
  }
  try {
    const { error } = await supabase.from('matches').delete().eq('room_code', roomCode);
    if (error) console.error('Supabase delete match error:', error.message);
  } catch (err) {
    console.error('Error deleting match from Supabase:', err);
  }
}

/**
 * STEP 6: Realtime Subscription to matches and ball_events
 */
export function subscribeToMatch(
  roomCode: string, 
  onUpdate: (match: MatchData, celebration?: any) => void
) {
  const code = roomCode.toUpperCase().trim();
  console.log('Realtime Connected for room:', code);

  // Listen to Local BroadcastChannel
  const handleLocalMsg = (event: MessageEvent) => {
    if (event.data?.type === 'MATCH_UPDATE' && event.data.match?.roomCode === code) {
      onUpdate(event.data.match, event.data.celebration);
    }
  };

  if (localBroadcast) {
    localBroadcast.addEventListener('message', handleLocalMsg);
  }

  // Subscribe via Supabase Realtime channel for matches and ball_events
  const channel = supabase.channel(`match_${code}`, {
    config: { broadcast: { self: true } }
  });

  channel
    .on('broadcast', { event: 'score_update' }, (payload) => {
      if (payload.payload?.match) {
        onUpdate(payload.payload.match, payload.payload.celebration);
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `room_code=eq.${code}` }, async () => {
      console.log('Realtime postgres_changes UPDATE detected for match:', code);
      const updated = await getMatchState(code);
      if (updated) onUpdate(updated);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ball_events', filter: `room_code=eq.${code}` }, async () => {
      console.log('Realtime postgres_changes INSERT detected for ball_events:', code);
      const updated = await getMatchState(code);
      if (updated) onUpdate(updated);
    })
    .subscribe((status) => {
      console.log(`Realtime channel status for ${code}:`, status);
    });

  return () => {
    if (localBroadcast) {
      localBroadcast.removeEventListener('message', handleLocalMsg);
    }
    supabase.removeChannel(channel);
  };
}

/**
 * Broadcast match state change via Realtime
 */
export function broadcastScoreUpdate(match: MatchData, celebration?: any) {
  const code = match.roomCode;
  
  if (localBroadcast) {
    localBroadcast.postMessage({ type: 'MATCH_UPDATE', match, celebration });
  }

  const channel = supabase.channel(`match_${code}`);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'score_update',
        payload: { match, celebration }
      });
    }
  });
}
