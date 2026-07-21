import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare, ArrowLeft } from 'lucide-react';
import type { MatchData, CelebrationEvent, BallEvent } from '../types';
import { subscribeToMatch } from '../lib/supabase';
import { calculateCRR, calculateRRR } from '../lib/scoring';
import { CelebrationOverlay } from './CelebrationOverlay';
import { sounds } from '../lib/audio';
import { RollingNumber } from './RollingNumber';

interface Props {
  initialMatch: MatchData;
  onBack: () => void;
  onMatchFinished: (match: MatchData) => void;
}

export const SpectatorScreen: React.FC<Props> = ({ initialMatch, onBack, onMatchFinished }) => {
  const [match, setMatch] = useState<MatchData>(initialMatch);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [viewingAllOvers, setViewingAllOvers] = useState<boolean>(false);
  const [selectedOversInnings, setSelectedOversInnings] = useState<1 | 2>(1);

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
  const currentTeam = match.battingTeam;
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
      desc: wicketEvent.commentaryText || `${wicketEvent.wicketBatsman || wicketEvent.batsmanName} out ${wicketEvent.wicketType || 'dismissed'}`
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

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#05070D] text-white p-3.5 select-none relative overflow-y-auto font-['Inter']">
      {/* Dynamic celebration event animation overlay */}
      <CelebrationOverlay celebration={celebration} onFinish={() => setCelebration(null)} />

      {/* 1. AppBar header */}
      <div className="row-grid-auto mb-3.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1 text-xl font-bold shrink-0">
            ←
          </button>
          <span className="text-white font-bold text-sm contain-text">{match.matchName}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="live-badge">
            <span className="live-dot"></span>
            <span className="live-text">LIVE</span>
          </div>
          <button
            onClick={toggleSound}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 btn-material"
          >
            {muted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. Premium Score Card */}
      <div className="score-card-demo shrink-0 mb-3">
        <div className="row-grid-auto items-end relative z-10">
          <div className="min-w-0">
            <div className="score-num-demo">
              <RollingNumber value={score} /><span className="wkts">/<RollingNumber value={wickets} /></span>
            </div>
            <div className="text-gray-400 text-xs mt-1.5 font-medium contain-text">
              Overs {overs} / {match.totalOvers} &nbsp;&middot;&nbsp; {currentTeam}
            </div>
          </div>
          <div className="text-center shrink-0 pl-2">
            <div className="text-[#00C6FF] font-bold text-lg font-mono">{crr}</div>
            <div className="text-[#8B93A7] text-[10px] tracking-wider font-semibold uppercase">CRR</div>
          </div>
        </div>

        {/* Target Banner */}
        {isSecondInnings && (
          <div className="target-banner-demo wrap-text mt-2">
            Target: {target} &nbsp;&middot;&nbsp; Need {Math.max(0, runsNeeded)} off {Math.max(0, remainingBalls)} balls (RRR: {rrr})
          </div>
        )}
      </div>

      {/* 3. This Over Circular Chips */}
      <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 mb-3 shrink-0 min-w-0">
        <div className="row-grid-auto mb-2.5 pr-2">
          <span className="text-[#8B93A7] text-[11px] font-bold tracking-wider uppercase contain-text">This Over</span>
          <button
            onClick={() => { sounds.playTap(); setViewingAllOvers(true); }}
            className="text-xs text-blue-400 font-bold hover:underline shrink-0 pl-2"
          >
            Overs Breakdown ›
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {match.ballEvents.length === 0 ? (
            <span className="text-xs text-gray-500 italic">Waiting for bowler...</span>
          ) : (
            match.ballEvents.slice(-8).map((evt) => renderBallChip(evt))
          )}
        </div>
      </div>

      {/* 4. Dynamic Win Probability Progress Bar */}
      <div className="win-prob-container shrink-0">
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
        <div className="flex justify-between text-xs font-mono font-bold mt-1 text-[#8B93A7]">
          <span>{winProb.teamA}%</span>
          <span>{winProb.teamB}%</span>
        </div>
      </div>

      {/* 5. Batsmen & Partnership Details Card */}
      <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 mb-3 shrink-0 min-w-0">
        <div className="text-[#8B93A7] text-[11px] font-bold tracking-wider mb-2.5 uppercase contain-text">Batting</div>

        {/* Striker Row */}
        <div className="row-grid-auto py-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow shrink-0">
              {match.strikerName.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-white text-xs font-bold contain-text">
              {match.strikerName} <span className="star-shimmer">★</span>
            </div>
          </div>
          <div className="text-[#9CA3AF] text-xs text-right font-mono shrink-0 pl-2">
            <b className="text-white font-bold">{match.strikerRuns}</b> ({match.strikerBalls}) &nbsp; SR <b className="text-white font-bold">{strikerSR}</b>
          </div>
        </div>

        {/* Non-Striker Row */}
        <div className="row-grid-auto py-1.5 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow shrink-0">
              {match.nonStrikerName.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-white text-xs font-bold contain-text">
              {match.nonStrikerName}
            </div>
          </div>
          <div className="text-[#9CA3AF] text-xs text-right font-mono shrink-0 pl-2">
            <b className="text-white font-bold">{match.nonStrikerRuns}</b> ({match.nonStrikerBalls}) &nbsp; SR <b className="text-white font-bold">{nonStrikerSR}</b>
          </div>
        </div>

        {/* Partnership row */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-[10px] font-bold text-[#8B93A7] uppercase">Current Partnership</span>
          <span className="text-xs font-bold text-[#00E676]">{partnership.runs} Runs <span className="text-gray-400 font-normal">({partnership.balls} balls)</span></span>
        </div>
      </div>

      {/* 6. Bowler Details Card */}
      <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 mb-3 row-grid-auto shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
            {match.bowlerName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-white text-xs font-bold contain-text">
            {match.bowlerName}
          </span>
        </div>
        <div className="text-[#9CA3AF] text-xs font-mono shrink-0 pl-2">
          <b className="text-white">{match.bowlerOvers}</b> Ov &nbsp;&middot;&nbsp; <b className="text-white">{match.bowlerRuns}</b> R &nbsp;&middot;&nbsp; <b className="text-red-400">{match.bowlerWickets}</b> W
        </div>
      </div>

      {/* 7. Last Wicket Details Card */}
      {lastWicket && (
        <div className="bg-red-950/20 border border-red-500/20 rounded-[20px] p-4 mb-3 shrink-0">
          <span className="text-red-400 text-[10px] font-bold tracking-wider uppercase block">Last Wicket Dismissed</span>
          <p className="text-xs font-bold text-white mt-1">{lastWicket.name}</p>
          <p className="text-[11px] text-red-300 mt-0.5">{lastWicket.desc}</p>
        </div>
      )}

      {/* 8. Live Commentary Feed */}
      <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 flex flex-col min-h-[140px] mb-1 overflow-hidden shrink-0 shadow-md">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 shrink-0">
          <MessageSquare size={16} className="text-blue-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 contain-text">Live Commentary</h3>
        </div>

        <div className="flex-1 overflow-y-auto pt-2 space-y-2 pr-1">
          {match.commentary.length === 0 ? (
            <p className="text-xs text-gray-500 italic text-center py-4">No commentary recorded yet</p>
          ) : (
            match.commentary.map((text, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl text-xs leading-relaxed transition ${
                  idx === 0
                    ? 'bg-blue-950/70 border border-blue-800/80 text-blue-200 font-semibold shadow'
                    : 'bg-[#05070D] border border-white/5 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                  <span className="text-[10px] text-gray-400 font-mono font-bold">Delivery #{match.commentary.length - idx}</span>
                </div>
                {text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
