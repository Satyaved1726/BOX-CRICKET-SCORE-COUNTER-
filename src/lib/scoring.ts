import type { MatchData, BallEvent, ExtraType, OutType, CelebrationEvent } from '../types';
import { sounds } from './audio';

/**
 * Generate unique 6-character room code (e.g. BSC482)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BSC';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format legal balls to cricket overs decimal representation (e.g. 20 legal balls = 3.2 overs)
 */
export function formatOvers(legalBalls: number): number {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return Number(`${overs}.${balls}`);
}

/**
 * Calculate Current Run Rate (CRR)
 */
export function calculateCRR(totalRuns: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  const crr = (totalRuns / legalBalls) * 6;
  return crr.toFixed(2);
}

/**
 * Calculate Required Run Rate (RRR)
 */
export function calculateRRR(targetRuns: number, currentScore: number, remainingBalls: number): string {
  const needed = targetRuns - currentScore;
  if (needed <= 0) return '0.00';
  if (remainingBalls <= 0) return '99.99';
  const rrr = (needed / remainingBalls) * 6;
  return rrr.toFixed(2);
}

/**
 * Generate rich auto commentary text
 */
export function generateCommentary(
  batsman: string,
  bowler: string,
  runsScored: number,
  extrasType: ExtraType,
  extrasRuns: number,
  isWicket: boolean,
  wicketType?: OutType
): string {
  if (isWicket) {
    switch (wicketType) {
      case 'bowled':
        return `OUT! ${batsman} is bowled by ${bowler}! Clean timber!`;
      case 'caught':
        return `OUT! ${batsman} is caught! Brilliant catch off ${bowler}'s bowling.`;
      case 'run_out':
        return `OUT! Direct hit! ${batsman} is run out!`;
      case 'lbw':
        return `OUT! Trapped right in front! ${batsman} is LBW to ${bowler}.`;
      case 'stumped':
        return `OUT! Quick hands behind the stumps! ${batsman} is stumped by ${bowler}.`;
      case 'hit_wicket':
        return `OUT! Unfortunate! ${batsman} hits the wickets!`;
      case 'retired_out':
        return `RETIRED OUT! ${batsman} walks off the field.`;
      default:
        return `OUT! ${batsman} departs off ${bowler}'s delivery.`;
    }
  }

  if (extrasType === 'wide') {
    const totalW = 1 + extrasRuns;
    if (extrasRuns === 0) return `Wide Ball signaled by the umpire. (+1 run)`;
    return `Wide Ball! Plus ${extrasRuns} extra runs taken! (+${totalW} runs)`;
  }

  if (extrasType === 'no_ball') {
    const totalNB = 1 + extrasRuns;
    if (extrasRuns === 0) return `No Ball! Free hit opportunity signaled! (+1 run)`;
    return `No Ball! ${extrasRuns} additional runs scored! (+${totalNB} runs)`;
  }

  if (extrasType === 'bye') {
    return `${extrasRuns} Bye ${extrasRuns === 1 ? 'run' : 'runs'} taken by ${batsman}.`;
  }

  if (extrasType === 'leg_bye') {
    return `${extrasRuns} Leg Bye ${extrasRuns === 1 ? 'run' : 'runs'} off the pads.`;
  }

  // Regular runs off bat
  switch (runsScored) {
    case 0:
      return `${bowler} to ${batsman}, dot ball. Solid defense.`;
    case 1:
      return `${batsman} works it into the gap for a single.`;
    case 2:
      return `Good running between the wickets! 2 runs for ${batsman}.`;
    case 3:
      return `Great placement! ${batsman} hustles for 3 runs.`;
    case 4:
      return `FOUR! Beautiful cover drive by ${batsman}! Races away to the boundary.`;
    case 5:
      return `5 runs! Overthrow adds extra runs for ${batsman}.`;
    case 6:
      return `SIX! Huge hit over long-on by ${batsman}! Out of the box!`;
    default:
      return `${runsScored} runs scored by ${batsman}.`;
  }
}

/**
 * Main pure scoring function to record a ball
 */
export function recordBall(
  currentMatch: MatchData,
  params: {
    runsScored: number;
    extrasType: ExtraType;
    extrasRuns: number;
    isWicket: boolean;
    wicketType?: OutType;
    runOutRuns?: number;
    newBatsmanName?: string;
    nextBowlerName?: string;
  }
): { updatedMatch: MatchData; celebration?: CelebrationEvent; isOverEnded: boolean; isInningsEnded: boolean; isMatchEnded: boolean } {
  const match: MatchData = JSON.parse(JSON.stringify(currentMatch)); // Deep clone
  const isSecondInnings = match.currentInnings === 2;

  // Innings attributes
  let currentScore = isSecondInnings ? match.scoreB : match.scoreA;
  let currentWickets = isSecondInnings ? match.wicketsB : match.wicketsA;
  let legalBalls = isSecondInnings ? match.legalBallsB : match.legalBallsA;

  const totalMatchOvers = match.totalOvers;
  const maxLegalBalls = totalMatchOvers * 6;

  // Determine ball parameters
  const { runsScored, extrasType, extrasRuns, isWicket, wicketType, runOutRuns, newBatsmanName, nextBowlerName } = params;
  
  let isLegal = true;
  let totalBallRuns = runsScored;

  if (extrasType === 'wide' || extrasType === 'no_ball') {
    isLegal = false;
    totalBallRuns = 1 + extrasRuns;
  } else if (extrasType === 'bye' || extrasType === 'leg_bye') {
    isLegal = true;
    totalBallRuns = extrasRuns;
  } else if (isWicket && wicketType === 'run_out') {
    isLegal = true;
    totalBallRuns = runOutRuns || 0;
  }

  // Update total score
  currentScore += totalBallRuns;

  // Legal ball increments
  if (isLegal) {
    legalBalls += 1;
  }

  // Over number calculation
  const overNumber = Math.floor((isLegal ? legalBalls - 1 : legalBalls) / 6);
  const ballNumberInOver = isLegal ? ((legalBalls - 1) % 6) + 1 : (legalBalls % 6);

  // Commentary
  const commentaryText = generateCommentary(
    match.strikerName,
    match.bowlerName,
    runsScored,
    extrasType,
    extrasRuns,
    isWicket,
    wicketType
  );

  // Create BallEvent record
  const ballEvent: BallEvent = {
    id: `ball_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    matchId: match.id,
    roomCode: match.roomCode,
    innings: match.currentInnings,
    overNumber,
    ballNumber: ballNumberInOver,
    batsmanName: match.strikerName,
    bowlerName: match.bowlerName,
    runsScored,
    extrasType,
    extrasRuns,
    totalBallRuns,
    isLegalDelivery: isLegal,
    isWicket,
    wicketType,
    wicketBatsman: isWicket ? match.strikerName : undefined,
    runOutRuns,
    commentaryText,
    timestamp: Date.now()
  };

  match.ballEvents.unshift(ballEvent);
  match.commentary.unshift(commentaryText);

  // Update Striker Stats
  if (!extrasType || extrasType === 'no_ball') {
    match.strikerRuns += runsScored;
  }
  if (isLegal || extrasType === 'no_ball') {
    match.strikerBalls += 1;
  }

  // Update Bowler Stats
  match.bowlerRuns += totalBallRuns;
  if (isLegal) {
    match.bowlerLegalBalls = (match.bowlerLegalBalls || 0) + 1;
    match.bowlerOvers = formatOvers(match.bowlerLegalBalls);
  }

  // Wicket Processing
  let celebration: CelebrationEvent | undefined = undefined;

  if (isWicket) {
    currentWickets += 1;
    match.bowlerWickets += 1;

    celebration = {
      type: 'WICKET',
      batsmanName: match.strikerName,
      bowlerName: match.bowlerName,
      details: wicketType ? wicketType.toUpperCase().replace('_', ' ') : 'WICKET'
    };

    sounds.playWicketSound();

    if (newBatsmanName && newBatsmanName.trim()) {
      match.strikerName = newBatsmanName.trim();
      match.strikerRuns = 0;
      match.strikerBalls = 0;
    } else {
      match.strikerName = `Batsman ${currentWickets + 2}`;
      match.strikerRuns = 0;
      match.strikerBalls = 0;
    }
  }

  // Boundary Celebrations
  if (!isWicket && (runsScored === 4 || (extrasType === 'no_ball' && extrasRuns === 4))) {
    celebration = { type: 'FOUR', batsmanName: match.strikerName };
    sounds.playFourSound();
  } else if (!isWicket && (runsScored === 6 || (extrasType === 'no_ball' && extrasRuns === 6))) {
    celebration = { type: 'SIX', batsmanName: match.strikerName };
    sounds.playSixSound();
  } else if (!isWicket) {
    sounds.playBatShot();
  }

  // Rotate Striker on odd runs scored
  const strikeRotateRuns = extrasType === 'bye' || extrasType === 'leg_bye' ? extrasRuns : runsScored;
  const shouldRotateForRuns = strikeRotateRuns % 2 !== 0;

  if (shouldRotateForRuns) {
    const tempName = match.strikerName;
    const tempRuns = match.strikerRuns;
    const tempBalls = match.strikerBalls;

    match.strikerName = match.nonStrikerName;
    match.strikerRuns = match.nonStrikerRuns;
    match.strikerBalls = match.nonStrikerBalls;

    match.nonStrikerName = tempName;
    match.nonStrikerRuns = tempRuns;
    match.nonStrikerBalls = tempBalls;
  }

  // Check End of Over (6 legal balls)
  const isOverEnded = isLegal && legalBalls % 6 === 0;

  if (isOverEnded) {
    sounds.playOverChime();

    // End of over strike rotation (swaps back if odd runs was scored on 6th ball)
    const tempName = match.strikerName;
    const tempRuns = match.strikerRuns;
    const tempBalls = match.strikerBalls;

    match.strikerName = match.nonStrikerName;
    match.strikerRuns = match.nonStrikerRuns;
    match.strikerBalls = match.nonStrikerBalls;

    match.nonStrikerName = tempName;
    match.nonStrikerRuns = tempRuns;
    match.nonStrikerBalls = tempBalls;

    if (nextBowlerName && nextBowlerName.trim()) {
      match.bowlerName = nextBowlerName.trim();
      match.bowlerOvers = 0.0;
      match.bowlerLegalBalls = 0;
      match.bowlerRuns = 0;
      match.bowlerWickets = 0;
    }
  }

  // Check Innings End or Match End
  let isMatchEnded = false;
  let isInningsEnded = false;

  const isAllOut = currentWickets >= 10;
  const isOversFinished = legalBalls >= maxLegalBalls;

  if (isSecondInnings) {
    match.scoreB = currentScore;
    match.wicketsB = currentWickets;
    match.legalBallsB = legalBalls;
    match.oversB = formatOvers(legalBalls);

    const target = match.targetRuns || (match.scoreA + 1);

    if (currentScore >= target) {
      isMatchEnded = true;
      match.status = 'finished';
      const remainingWickets = 10 - currentWickets;
      match.winnerTeam = match.battingTeam;
      match.resultSummary = `${match.battingTeam} won by ${remainingWickets} ${remainingWickets === 1 ? 'wicket' : 'wickets'}!`;
      sounds.playWinnerFanfare();
    } else if (isAllOut || isOversFinished) {
      isMatchEnded = true;
      match.status = 'finished';
      if (currentScore === match.scoreA) {
        match.winnerTeam = 'Tie';
        match.resultSummary = 'Match Tied!';
      } else {
        const runDiff = match.scoreA - currentScore;
        match.winnerTeam = match.bowlingTeam;
        match.resultSummary = `${match.bowlingTeam} won by ${runDiff} runs!`;
      }
      sounds.playWinnerFanfare();
    }
  } else {
    // 1st Innings
    match.scoreA = currentScore;
    match.wicketsA = currentWickets;
    match.legalBallsA = legalBalls;
    match.oversA = formatOvers(legalBalls);

    if (isAllOut || isOversFinished) {
      isInningsEnded = true;
      match.currentInnings = 2;
      match.targetRuns = match.scoreA + 1;

      // Swap Batting & Bowling Teams for 2nd Innings
      const prevBatting = match.battingTeam;
      match.battingTeam = match.bowlingTeam;
      match.bowlingTeam = prevBatting;

      // Reset Players for 2nd Innings
      match.strikerName = 'Batsman 1';
      match.strikerRuns = 0;
      match.strikerBalls = 0;
      match.nonStrikerName = 'Batsman 2';
      match.nonStrikerRuns = 0;
      match.nonStrikerBalls = 0;
      match.bowlerName = 'Bowler 1';
      match.bowlerOvers = 0.0;
      match.bowlerRuns = 0;
      match.bowlerWickets = 0;
      match.bowlerLegalBalls = 0;
    }
  }

  match.updatedAt = Date.now();

  return {
    updatedMatch: match,
    celebration,
    isOverEnded,
    isInningsEnded,
    isMatchEnded
  };
}

/**
 * Undo last recorded ball event
 */
export function undoLastBall(match: MatchData): MatchData {
  if (!match.ballEvents || match.ballEvents.length === 0) return match;

  const clone: MatchData = JSON.parse(JSON.stringify(match));
  clone.ballEvents.shift();
  clone.commentary.shift();

  // Recalculate match state from scratch to ensure 100% precision
  const initialMatch: MatchData = {
    ...clone,
    scoreA: 0,
    wicketsA: 0,
    oversA: 0,
    legalBallsA: 0,
    scoreB: 0,
    wicketsB: 0,
    oversB: 0,
    legalBallsB: 0,
    currentInnings: 1,
    status: 'live',
    strikerName: 'Rahul',
    strikerRuns: 0,
    strikerBalls: 0,
    nonStrikerName: 'Ajay',
    nonStrikerRuns: 0,
    nonStrikerBalls: 0,
    bowlerName: 'Rakesh',
    bowlerOvers: 0,
    bowlerRuns: 0,
    bowlerWickets: 0,
    bowlerLegalBalls: 0,
    commentary: [],
    ballEvents: []
  };

  const reversedEvents = [...clone.ballEvents].reverse();

  let state = initialMatch;
  reversedEvents.forEach(evt => {
    const res = recordBall(state, {
      runsScored: evt.runsScored,
      extrasType: evt.extrasType,
      extrasRuns: evt.extrasRuns,
      isWicket: evt.isWicket,
      wicketType: evt.wicketType,
      runOutRuns: evt.runOutRuns,
      newBatsmanName: evt.batsmanName,
      nextBowlerName: evt.bowlerName
    });
    state = res.updatedMatch;
  });

  return state;
}
