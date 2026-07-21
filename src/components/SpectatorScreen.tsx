import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare, ArrowLeft } from 'lucide-react';
import type { MatchData, CelebrationEvent, BallEvent } from '../types';
import { subscribeToMatch } from '../lib/supabase';
import { calculateCRR, calculateRRR } from '../lib/scoring';
import { CelebrationOverlay } from './CelebrationOverlay';
import { sounds } from '../lib/audio';
import { StatCharts } from './StatCharts';

interface Props {
  initialMatch: MatchData;
  onBack: () => void;
  onMatchFinished: (match: MatchData) => void;
}

type TabType = 'live' | 'commentary' | 'scorecard' | 'stats';

export const SpectatorScreen: React.FC<Props> = ({ initialMatch, onBack, onMatchFinished }) => {
  const [match, setMatch] = useState<MatchData>(initialMatch);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [viewingAllOvers, setViewingAllOvers] = useState<boolean>(false);
  const [selectedOversInnings, setSelectedOversInnings] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<TabType>('live');

  useEffect(() => {
    const unsubscribe = subscribeToMatch(initialMatch.roomCode, (updatedMatch, newCelebration) => {
      setMatch(updatedMatch);

      if (newCelebration) {
        setCelebration(newCelebration);
      }

      if (updatedMatch.status === 'finished') {
        onMatchFinished(updatedMatch);
      }
    });

    return () => unsubscribe();
  }, [initialMatch.roomCode, onMatchFinished]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sounds.setEnabled(!next);
  };

  const isSecondInnings = match.currentInnings === 2;
  const score = isSecondInnings ? match.scoreB : match.scoreA;
  const wickets = isSecondInnings ? match.wicketsB : match.wicketsA;
  const overs = isSecondInnings ? match.oversB : match.oversA;
  const legalBalls = isSecondInnings ? match.legalBallsB : match.legalBallsA;
  const totalBalls = match.totalOvers * 6;
  const remainingBalls = totalBalls - legalBalls;

  const crr = calculateCRR(score, legalBalls);
  const target = match.targetRuns || (match.scoreA + 1);
  const runsNeeded = target - score;
  const rrr = isSecondInnings ? calculateRRR(target, score, remainingBalls) : '0.00';

  const strikerSR = match.strikerBalls > 0 ? ((match.strikerRuns / match.strikerBalls) * 100).toFixed(1) : '0.0';
  const nonStrikerSR = match.nonStrikerBalls > 0 ? ((match.nonStrikerRuns / match.nonStrikerBalls) * 100).toFixed(1) : '0.0';

  // Dynamic Partnership Calculation
  const getPartnership = () => {
    const currentInningsEvents = match.ballEvents.filter(e => e.innings === match.currentInnings);
    let lastWicketIdx = -1;
    for (let i = currentInningsEvents.length - 1; i >= 0; i--) {
      if (currentInningsEvents[i].isWicket) {
        lastWicketIdx = i;
        break;
      }
    }

    let runs = 0;
    let balls = 0;
    const eventsAfterWicket = lastWicketIdx === -1
      ? currentInningsEvents
      : currentInningsEvents.slice(lastWicketIdx + 1);

    eventsAfterWicket.forEach(e => {
      runs += e.totalBallRuns;
      if (e.isLegalDelivery) {
        balls += 1;
      }
    });

    if (runs === 0 && (match.strikerRuns > 0 || match.nonStrikerRuns > 0)) {
      runs = match.strikerRuns + match.nonStrikerRuns;
      balls = match.strikerBalls + match.nonStrikerBalls;
    }

    return { runs, balls };
  };

  // Dynamic Last Wicket Calculation
  const getLastWicket = () => {
    const currentInningsEvents = match.ballEvents.filter(e => e.innings === match.currentInnings);
    const wicketEvent = [...currentInningsEvents].reverse().find(e => e.isWicket);
    if (!wicketEvent) return null;

    return {
      name: wicketEvent.wicketBatsman || wicketEvent.batsmanName,
      runs: wicketEvent.runsScored,
      balls: wicketEvent.isLegalDelivery ? 1 : 0
    };
  };

  // Dynamic Win Probability Calculation
  const getWinProbability = () => {
    if (match.currentInnings === 1) {
      const crrVal = parseFloat(crr);
      if (isNaN(crrVal) || crrVal === 0) return { teamA: 50, teamB: 50 };
      let teamAProb = 50 + (crrVal - 8.5) * 4.5;
      teamAProb = Math.max(15, Math.min(85, teamAProb));
      return {
        teamA: Math.round(teamAProb),
        teamB: Math.round(100 - teamAProb)
      };
    } else {
      const runsVal = runsNeeded;
      const ballsVal = remainingBalls;
      if (runsVal <= 0) return { teamA: 0, teamB: 100 };
      if (ballsVal <= 0) return { teamA: 100, teamB: 0 };

      const rrrVal = parseFloat(rrr);
      if (isNaN(rrrVal)) return { teamA: 50, teamB: 50 };

      let teamBProb = 50 - (rrrVal - 8.5) * 5.5;
      teamBProb = Math.max(5, Math.min(95, teamBProb));
      return {
        teamA: Math.round(100 - teamBProb),
        teamB: Math.round(teamBProb)
      };
    }
  };

  // Helper to render perfectly circular chips with color coding
  const renderBallChip = (evt: BallEvent) => {
    let label = `${evt.runsScored}`;
    let cls = 'crex-chip-run';

    if (evt.isWicket) {
      label = 'W';
      cls = 'crex-chip-wicket';
    } else if (evt.extrasType === 'wide') {
      label = evt.extrasRuns > 0 ? `Wd+${evt.extrasRuns}` : 'Wd';
      cls = 'crex-chip-wide';
    } else if (evt.extrasType === 'no_ball') {
      label = evt.extrasRuns > 0 ? `Nb+${evt.extrasRuns}` : 'Nb';
      cls = 'crex-chip-noball';
    } else if (evt.extrasType === 'bye') {
      label = evt.extrasRuns > 0 ? `B+${evt.extrasRuns}` : 'B';
      cls = 'crex-chip-bye';
    } else if (evt.extrasType === 'leg_bye') {
      label = evt.extrasRuns > 0 ? `LB+${evt.extrasRuns}` : 'LB';
      cls = 'crex-chip-legbye';
    } else if (evt.runsScored === 0) {
      label = '•';
      cls = 'crex-chip-dot';
    } else if (evt.runsScored === 4) {
      label = '4';
      cls = 'crex-chip-four';
    } else if (evt.runsScored === 6) {
      label = '6';
      cls = 'crex-chip-six';
    }

    return (
      <div key={evt.id} className={`crex-chip ${cls}`}>
        {label}
      </div>
    );
  };

  const getOversGrouped = (innings: 1 | 2) => {
    const events = match.ballEvents.filter(e => e.innings === innings);
    const oversMap: Record<number, { overNumber: number; bowlerName: string; balls: BallEvent[]; runs: number; wickets: BallEvent[] }> = {};

    events.forEach(e => {
      const ov = e.overNumber;
      if (!oversMap[ov]) {
        oversMap[ov] = {
          overNumber: ov,
          bowlerName: e.bowlerName,
          balls: [],
          runs: 0,
          wickets: []
        };
      }
      oversMap[ov].balls.push(e);
      oversMap[ov].runs += e.totalBallRuns;
      if (e.isWicket) {
        oversMap[ov].wickets.push(e);
      }
    });

    return Object.values(oversMap).sort((a, b) => a.overNumber - b.overNumber);
  };

  // Reconstruct Full Innings Scorecard from Ball Events list
  const computeInningsScorecard = (innings: 1 | 2) => {
    const events = match.ballEvents.filter(e => e.innings === innings);
    const batters: Record<string, { name: string; runs: number; balls: number; fours: number; sixes: number; isOut: boolean; outType?: string }> = {};
    const bowlers: Record<string, { name: string; legalBalls: number; runsConceded: number; wickets: number }> = {};

    events.forEach(e => {
      // Batter parsing
      if (!batters[e.batsmanName]) {
        batters[e.batsmanName] = { name: e.batsmanName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
      }
      batters[e.batsmanName].runs += e.runsScored;
      if (e.isLegalDelivery) {
        batters[e.batsmanName].balls += 1;
      }
      if (e.runsScored === 4) {
        batters[e.batsmanName].fours += 1;
      }
      if (e.runsScored === 6) {
        batters[e.batsmanName].sixes += 1;
      }
      if (e.isWicket) {
        const outPlayer = e.wicketBatsman || e.batsmanName;
        if (!batters[outPlayer]) {
          batters[outPlayer] = { name: outPlayer, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        }
        batters[outPlayer].isOut = true;
        batters[outPlayer].outType = e.wicketType;
      }

      // Bowler parsing
      if (!bowlers[e.bowlerName]) {
        bowlers[e.bowlerName] = { name: e.bowlerName, legalBalls: 0, runsConceded: 0, wickets: 0 };
      }
      bowlers[e.bowlerName].runsConceded += e.totalBallRuns;
      if (e.isLegalDelivery) {
        bowlers[e.bowlerName].legalBalls += 1;
      }
      if (e.isWicket && e.wicketType !== 'run_out') {
        bowlers[e.bowlerName].wickets += 1;
      }
    });

    // Merge active striker/non-striker/bowler metrics if live
    if (innings === match.currentInnings) {
      if (match.strikerName && !batters[match.strikerName]) {
        batters[match.strikerName] = { name: match.strikerName, runs: match.strikerRuns, balls: match.strikerBalls, fours: 0, sixes: 0, isOut: false };
      }
      if (match.nonStrikerName && !batters[match.nonStrikerName]) {
        batters[match.nonStrikerName] = { name: match.nonStrikerName, runs: match.nonStrikerRuns, balls: match.nonStrikerBalls, fours: 0, sixes: 0, isOut: false };
      }
      if (match.bowlerName && !bowlers[match.bowlerName]) {
        bowlers[match.bowlerName] = { name: match.bowlerName, legalBalls: match.bowlerLegalBalls, runsConceded: match.bowlerRuns, wickets: match.bowlerWickets };
      }
    }

    return { batters: Object.values(batters), bowlers: Object.values(bowlers) };
  };

  const partnership = getPartnership();
  const lastWicket = getLastWicket();
  const winProb = getWinProbability();
  const activeInningsOvers = getOversGrouped(selectedOversInnings);

  // Render the "All Overs" page if viewingAllOvers is true
  if (viewingAllOvers) {
    return (
      <div className="flex-1 flex flex-col bg-[#05070D] text-white select-none overflow-y-auto font-['Inter'] relative min-h-screen">
        {/* Top Bar */}
        <div className="overs-header">
          <button onClick={() => setViewingAllOvers(false)} className="text-white hover:text-blue-400 transition mr-2">
            <ArrowLeft size={22} />
          </button>
          <span className="text-base font-extrabold text-white">All Overs</span>
        </div>

        {/* Innings Selector Segment Control */}
        <div className="overs-segment-grid">
          <button
            onClick={() => setSelectedOversInnings(1)}
            className={`overs-segment-btn ${selectedOversInnings === 1 ? 'active' : ''}`}
          >
            {match.teamA} (1st Inn)
          </button>
          <button
            onClick={() => setSelectedOversInnings(2)}
            className={`overs-segment-btn ${selectedOversInnings === 2 ? 'active' : ''}`}
          >
            {match.teamB} (2nd Inn)
          </button>
        </div>

        {/* Grouped overs timeline details */}
        {activeInningsOvers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-12">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-3xl mb-4">
              📭
            </div>
            <h4 className="text-sm font-extrabold text-white mb-1">Innings has not started yet</h4>
            <p className="text-xs text-gray-400 max-w-[240px]">
              Waiting for umpire to begin scoring this innings.
            </p>
          </div>
        ) : (
          <div className="overs-list-container">
            {activeInningsOvers.map((over) => (
              <div key={over.overNumber} className="overs-card">
                <div className="overs-card-row1">
                  <div>
                    <span className="overs-card-num">Over {over.overNumber + 1}</span>
                    <p className="overs-card-bowler mt-0.5">Bowler: {over.bowlerName}</p>
                  </div>
                  <span className="overs-card-runs">= {over.runs} Runs</span>
                </div>

                {/* Circular chips sequence */}
                <div className="overs-card-chips">
                  {over.balls.map((b) => renderBallChip(b))}
                </div>

                {/* Nested wicket notification details */}
                {over.wickets.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    {over.wickets.map((w) => (
                      <div key={w.id} className="overs-wicket-event">
                        <span className="overs-wicket-title">🔴 WICKET</span>
                        <p className="overs-wicket-desc">{w.wicketBatsman || w.batsmanName}</p>
                        <p className="overs-wicket-extra">
                          {w.wicketType ? `${w.wicketType.replace('_', ' ')} • Bowled by ${w.bowlerName}` : `Dismissed by ${w.bowlerName}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Calculate stats formatting
  const currentInningsBowlerEcon = match.bowlerLegalBalls > 0
    ? ((match.bowlerRuns / match.bowlerLegalBalls) * 6).toFixed(2)
    : '0.00';

  return (
    <div className="flex-1 flex flex-col bg-[#05070D] text-white select-none relative overflow-y-auto font-['Inter'] min-h-screen">
      {/* Dynamic celebration event animation overlay */}
      <CelebrationOverlay celebration={celebration} onFinish={() => setCelebration(null)} />

      {/* 1. AppBar Header */}
      <div className="flex items-center justify-between p-4 bg-[#08111F] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1 transition shrink-0">
            <ArrowLeft size={22} />
          </button>
          <span className="text-white font-extrabold text-sm truncate">
            {match.teamA} vs {match.teamB}, {match.matchName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="live-badge">
            <span className="live-dot"></span>
            <span className="live-text">LIVE</span>
          </div>
          <button
            onClick={toggleSound}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 transition"
          >
            {muted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. CREX Horizontal Scrollable Navigation Tabs */}
      <div className="crex-tabs-container">
        <div onClick={() => setActiveTab('live')} className={`crex-tab ${activeTab === 'live' ? 'active' : ''}`}>
          Live
        </div>
        <div onClick={() => setActiveTab('commentary')} className={`crex-tab ${activeTab === 'commentary' ? 'active' : ''}`}>
          Commentary
        </div>
        <div onClick={() => setActiveTab('scorecard')} className={`crex-tab ${activeTab === 'scorecard' ? 'active' : ''}`}>
          Scorecard
        </div>
        <div onClick={() => setActiveTab('stats')} className={`crex-tab ${activeTab === 'stats' ? 'active' : ''}`}>
          Graphs &amp; Stats
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4 flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'live' && (
          <>
            {/* CREX Score Box */}
            <div className="bg-[#111827] border border-white/10 rounded-22 p-4 mb-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg tracking-wide text-white">{match.battingTeam}</span>
                    {isSecondInnings && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-600/20 text-rose-400 rounded-full font-bold">2nd Inn</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-3xl font-black font-['Poppins'] text-[#00C6FF]">
                      {score}-{wickets}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">({overs} Ov)</span>
                  </div>
                </div>

                {/* Right side large target runs indicator */}
                <div className="text-right">
                  <div className="text-4xl font-black text-rose-400 animate-pulse font-['Poppins']">
                    {isSecondInnings ? Math.max(0, runsNeeded) : score}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    {isSecondInnings ? 'Runs Req' : 'Current runs'}
                  </div>
                </div>
              </div>

              {/* CRR & Toss Details Row */}
              <div className="flex justify-between items-center pt-3 text-xs text-gray-400 font-bold border-b border-white/5 pb-3">
                <span>CRR: {crr}</span>
                <span>Toss: {match.tossWinner} ({match.tossDecision})</span>
              </div>

              {/* Over Ball Chips Row */}
              <div className="flex justify-between items-center pt-3">
                <div className="flex gap-2 items-center overflow-x-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">This Over:</span>
                  {match.ballEvents.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">Waiting...</span>
                  ) : (
                    match.ballEvents.slice(-6).map((evt) => renderBallChip(evt))
                  )}
                </div>
                <button
                  onClick={() => { sounds.playTap(); setViewingAllOvers(true); }}
                  className="text-xs font-bold text-[#F43F5E] hover:underline shrink-0 pl-3"
                >
                  Overs ›
                </button>
              </div>
            </div>

            {/* Chasing Target Banner */}
            {isSecondInnings && (
              <div className="bg-rose-950/20 border border-rose-500/20 rounded-20 p-3.5 mb-4 text-xs font-bold text-center text-rose-300">
                Need {Math.max(0, runsNeeded)} runs off {Math.max(0, remainingBalls)} balls at RRR: {rrr}
              </div>
            )}

            {/* Win Probability Block */}
            <div className="win-prob-container">
              <div className="win-prob-header">
                <span>{match.teamA} Prob</span>
                <span>{match.teamB} Prob</span>
              </div>
              <div className="win-prob-bar-wrapper">
                <div
                  className="win-prob-bar-fill"
                  style={{ width: `${winProb.teamA}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-mono font-bold mt-1.5 text-[#8B93A7]">
                <span>{winProb.teamA}%</span>
                <span>{winProb.teamB}%</span>
              </div>
            </div>

            {/* Tabular Batter Card */}
            <div className="bg-[#111827] border border-white/10 rounded-22 overflow-hidden mb-4 p-1">
              <div className="crex-table-header">
                <span>Batter</span>
                <span className="text-right">R (B)</span>
                <span className="text-center">4s</span>
                <span className="text-center">6s</span>
                <span className="text-right">SR</span>
              </div>

              {/* Striker Row */}
              <div className="crex-table-row">
                <span className="truncate flex items-center gap-1">
                  {match.strikerName} <span className="text-amber-400">🏏</span>
                </span>
                <span className="text-right font-mono">{match.strikerRuns} ({match.strikerBalls})</span>
                <span className="text-center font-mono">0</span>
                <span className="text-center font-mono">0</span>
                <span className="text-right font-mono text-[#00C6FF]">{strikerSR}</span>
              </div>

              {/* Non-Striker Row */}
              <div className="crex-table-row inactive">
                <span className="truncate">{match.nonStrikerName}</span>
                <span className="text-right font-mono">{match.nonStrikerRuns} ({match.nonStrikerBalls})</span>
                <span className="text-center font-mono">0</span>
                <span className="text-center font-mono">0</span>
                <span className="text-right font-mono text-[#8B93A7]">{nonStrikerSR}</span>
              </div>

              {/* Partnership and last wicket details row */}
              <div className="crex-scorecard-subrow py-3">
                <span className="pship">P'ship: {partnership.runs} ({partnership.balls})</span>
                {lastWicket && (
                  <span className="lastwkt">Last wkt: {lastWicket.name} {lastWicket.runs} ({lastWicket.balls})</span>
                )}
              </div>
            </div>

            {/* Tabular Bowler Card */}
            <div className="bg-[#111827] border border-white/10 rounded-22 overflow-hidden mb-4 p-1">
              <div className="crex-bowler-header">
                <span>Bowler</span>
                <span className="text-right">W-R</span>
                <span className="text-center">Overs</span>
                <span className="text-right">Econ</span>
              </div>

              <div className="crex-bowler-row">
                <span className="truncate">{match.bowlerName}</span>
                <span className="text-right font-mono text-rose-400">
                  {match.bowlerWickets}-{match.bowlerRuns}
                </span>
                <span className="text-center font-mono">{match.bowlerOvers}</span>
                <span className="text-right font-mono text-[#00E676]">{currentInningsBowlerEcon}</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'commentary' && (
          <div className="flex-grow flex flex-col overflow-hidden max-h-[75vh]">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-3 shrink-0">
              <MessageSquare size={16} className="text-blue-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Live Commentary Log</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {match.commentary.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-8">No commentary recorded yet</p>
              ) : (
                match.commentary.map((text, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs leading-relaxed transition ${
                      idx === 0
                        ? 'bg-blue-950/70 border border-blue-800/80 text-blue-200 font-semibold shadow'
                        : 'bg-[#111827] border border-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                      <span className="text-[10px] text-gray-400 font-mono font-bold">Ball #{match.commentary.length - idx}</span>
                    </div>
                    {text}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            {/* Innings 1 Scorecard */}
            <div className="crex-scorecard-innings-box">
              <div className="crex-scorecard-innings-title pb-2 border-b border-white/5">
                <span>{match.teamA} (Innings 1)</span>
                <span className="text-rose-400">{match.scoreA}/{match.wicketsA} ({match.oversA} Ov)</span>
              </div>
              {/* Batters */}
              <div className="crex-table-header">
                <span>Batter</span>
                <span className="text-right">R (B)</span>
                <span className="text-center">4s</span>
                <span className="text-center">6s</span>
                <span className="text-right">SR</span>
              </div>
              {computeInningsScorecard(1).batters.map((b, idx) => (
                <div key={idx} className="crex-table-row">
                  <span className="truncate">{b.name} {b.isOut ? '' : '*'}</span>
                  <span className="text-right font-mono">{b.runs} ({b.balls})</span>
                  <span className="text-center font-mono">{b.fours}</span>
                  <span className="text-center font-mono">{b.sixes}</span>
                  <span className="text-right font-mono text-gray-400">
                    {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                  </span>
                </div>
              ))}

              {/* Bowlers */}
              <div className="crex-bowler-header mt-4">
                <span>Bowler</span>
                <span className="text-right">W-R</span>
                <span className="text-center">Overs</span>
                <span className="text-right">Econ</span>
              </div>
              {computeInningsScorecard(1).bowlers.map((b, idx) => (
                <div key={idx} className="crex-bowler-row">
                  <span className="truncate">{b.name}</span>
                  <span className="text-right font-mono text-rose-400">{b.wickets}-{b.runsConceded}</span>
                  <span className="text-center font-mono">{(b.legalBalls / 6).toFixed(1)}</span>
                  <span className="text-right font-mono text-[#00E676]">
                    {b.legalBalls > 0 ? ((b.runsConceded / b.legalBalls) * 6).toFixed(2) : '0.00'}
                  </span>
                </div>
              ))}
            </div>

            {/* Innings 2 Scorecard */}
            <div className="crex-scorecard-innings-box">
              <div className="crex-scorecard-innings-title pb-2 border-b border-white/5">
                <span>{match.teamB} (Innings 2)</span>
                <span className="text-rose-400">
                  {match.currentInnings >= 2 ? `${match.scoreB}/${match.wicketsB} (${match.oversB} Ov)` : 'Yet to bat'}
                </span>
              </div>
              {match.currentInnings >= 2 ? (
                <>
                  <div className="crex-table-header">
                    <span>Batter</span>
                    <span className="text-right">R (B)</span>
                    <span className="text-center">4s</span>
                    <span className="text-center">6s</span>
                    <span className="text-right">SR</span>
                  </div>
                  {computeInningsScorecard(2).batters.map((b, idx) => (
                    <div key={idx} className="crex-table-row">
                      <span className="truncate">{b.name} {b.isOut ? '' : '*'}</span>
                      <span className="text-right font-mono">{b.runs} ({b.balls})</span>
                      <span className="text-center font-mono">{b.fours}</span>
                      <span className="text-center font-mono">{b.sixes}</span>
                      <span className="text-right font-mono text-gray-400">
                        {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                      </span>
                    </div>
                  ))}

                  <div className="crex-bowler-header mt-4">
                    <span>Bowler</span>
                    <span className="text-right">W-R</span>
                    <span className="text-center">Overs</span>
                    <span className="text-right">Econ</span>
                  </div>
                  {computeInningsScorecard(2).bowlers.map((b, idx) => (
                    <div key={idx} className="crex-bowler-row">
                      <span className="truncate">{b.name}</span>
                      <span className="text-right font-mono text-rose-400">{b.wickets}-{b.runsConceded}</span>
                      <span className="text-center font-mono">{(b.legalBalls / 6).toFixed(1)}</span>
                      <span className="text-right font-mono text-[#00E676]">
                        {b.legalBalls > 0 ? ((b.runsConceded / b.legalBalls) * 6).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-gray-500 italic text-center py-4">Second innings has not started yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="flex-1 overflow-y-auto">
            <StatCharts match={match} />
          </div>
        )}
      </div>
    </div>
  );
};
