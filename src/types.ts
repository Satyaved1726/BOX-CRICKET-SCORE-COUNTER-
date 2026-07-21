export type OutType = 
  | 'bowled' 
  | 'caught' 
  | 'run_out' 
  | 'lbw' 
  | 'stumped' 
  | 'hit_wicket' 
  | 'retired_out';

export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;

export interface PlayerStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut?: boolean;
  outType?: OutType;
}

export interface BowlerStats {
  name: string;
  overs: number; // e.g. 2.4
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
}

export interface BallEvent {
  id: string;
  matchId: string;
  roomCode: string;
  innings: 1 | 2;
  overNumber: number; // 0-indexed over
  ballNumber: number; // legal ball count in over (1-6)
  batsmanName: string;
  bowlerName: string;
  runsScored: number; // runs off bat
  extrasType: ExtraType;
  extrasRuns: number; // e.g. 1 for wide/nb plus additional
  totalBallRuns: number;
  isLegalDelivery: boolean;
  isWicket: boolean;
  wicketType?: OutType;
  wicketBatsman?: string;
  runOutRuns?: number;
  commentaryText: string;
  timestamp: number;
}

export interface InningsState {
  teamName: string;
  score: number;
  wickets: number;
  overs: number;
  legalBalls: number;
  striker: PlayerStats;
  nonStriker: PlayerStats;
  currentBowler: BowlerStats;
  batsmenList: PlayerStats[];
  bowlersList: BowlerStats[];
  ballTimeline: BallEvent[];
}

export interface MatchData {
  id: string;
  roomCode: string; // e.g. BSC482
  tournamentName: string;
  matchName: string;
  ground: string;
  teamA: string;
  teamB: string;
  totalOvers: number;
  tossWinner: string;
  tossDecision: 'bat' | 'bowl';
  battingTeam: string;
  bowlingTeam: string;
  currentInnings: 1 | 2;
  status: 'live' | 'finished';
  
  // Innings 1
  scoreA: number;
  wicketsA: number;
  oversA: number;
  legalBallsA: number;
  
  // Innings 2
  scoreB: number;
  wicketsB: number;
  oversB: number;
  legalBallsB: number;
  
  targetRuns?: number;
  
  // Active Player stats
  strikerName: string;
  strikerRuns: number;
  strikerBalls: number;
  
  nonStrikerName: string;
  nonStrikerRuns: number;
  nonStrikerBalls: number;
  
  bowlerName: string;
  bowlerOvers: number;
  bowlerRuns: number;
  bowlerWickets: number;
  bowlerLegalBalls: number;
  
  commentary: string[];
  ballEvents: BallEvent[];
  
  resultSummary?: string;
  winnerTeam?: string;
  
  createdAt: number;
  updatedAt: number;
}

export type CelebrationEvent = {
  type: 'FOUR' | 'SIX' | 'WICKET';
  batsmanName?: string;
  bowlerName?: string;
  details?: string;
};
