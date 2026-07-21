import React, { useState } from 'react';
import type { MatchData, OutType, ExtraType, CelebrationEvent } from '../types';
import { calculateCRR, calculateRRR, recordBall, undoLastBall } from '../lib/scoring';
import { saveMatchState, saveBallEvent, saveOverSummary, broadcastScoreUpdate } from '../lib/supabase';
import { sounds } from '../lib/audio';
import { OverBreakdownModal } from './OverBreakdownModal';
import { StatCharts } from './StatCharts';
import { RollingNumber } from './RollingNumber';

interface Props {
  match: MatchData;
  onBack: () => void;
  onMatchFinished: (match: MatchData) => void;
}

export const LiveScoringUmpire: React.FC<Props> = ({ match: initialMatch, onBack, onMatchFinished }) => {
  const [match, setMatch] = useState<MatchData>(initialMatch);
  const [activeTab, setActiveTab] = useState<'scoring' | 'stats'>('scoring');

  // Bottom sheets / Modals state
  const [activeBottomSheet, setActiveBottomSheet] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'out' | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<OutType | null>(null);
  
  // Over breakdown modal state
  const [showOverBreakdown, setShowOverBreakdown] = useState<boolean>(false);

  // Umpire match controls menu state
  const [showMatchControls, setShowMatchControls] = useState<boolean>(false);
  const [isDrinksBreak, setIsDrinksBreak] = useState<boolean>(false);
  const [selectedControlAction, setSelectedControlAction] = useState<'drinks' | 'innings' | 'end'>('end');

  // New Batsman Modal
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState<boolean>(false);
  const [newBatsmanInput, setNewBatsmanInput] = useState<string>('');

  // Change Bowler Modal
  const [showChangeBowlerModal, setShowChangeBowlerModal] = useState<boolean>(false);
  const [newBowlerInput, setNewBowlerInput] = useState<string>('');

  // Edit Player Name Modal
  const [editPlayerTarget, setEditPlayerTarget] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [editPlayerInput, setEditPlayerInput] = useState<string>('');

  // Pending ball payload waiting for new batsman / bowler input
  const [pendingBall, setPendingBall] = useState<any>(null);

  // Track last saved ball ID to avoid duplicate inserts
  const [lastSavedBallId, setLastSavedBallId] = useState<string | null>(null);

  // Deep update match state helper
  const updateMatch = async (updated: MatchData, celebration?: CelebrationEvent) => {
    setMatch(updated);

    // Save latest ball event to ball_events table if a new ball was recorded
    if (updated.ballEvents && updated.ballEvents.length > 0) {
      const latestBall = updated.ballEvents[0];
      if (latestBall && latestBall.id !== lastSavedBallId) {
        setLastSavedBallId(latestBall.id);
        saveBallEvent(updated.id, updated.roomCode, latestBall);

        // Compute and save over summary for public.over_summary table
        const currentInningsEvents = updated.ballEvents.filter(
          (b) => b.innings === updated.currentInnings && b.overNumber === latestBall.overNumber
        );
        const overRuns = currentInningsEvents.reduce((acc, b) => acc + b.totalBallRuns, 0);
        const overWickets = currentInningsEvents.filter((b) => b.isWicket).length;
        const ballSeq = currentInningsEvents.map((b) => {
          if (b.isWicket) return 'W';
          if (b.extrasType === 'wide') return 'Wd';
          if (b.extrasType === 'no_ball') return 'Nb';
          return String(b.totalBallRuns);
        });

        saveOverSummary(
          updated.id,
          updated.roomCode,
          latestBall.overNumber,
          latestBall.bowlerName,
          overRuns,
          overWickets,
          ballSeq
        );
      }
    }

    await saveMatchState(updated);
    broadcastScoreUpdate(updated, celebration);

    if (updated.status === 'finished') {
      console.log('Match Finished. Final Score:', updated.scoreA, updated.scoreB);
      onMatchFinished(updated);
    }
  };

  // Main button tap handler for 0-6 runs
  const handleScoreTap = (runs: number, e?: React.MouseEvent<HTMLButtonElement>) => {
    sounds.playTap();

    // Trigger ripple animation
    if (e && e.currentTarget) {
      const btn = e.currentTarget;
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.width = r.style.height = `${btn.getBoundingClientRect().width}px`;
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }

    const res = recordBall(match, {
      runsScored: runs,
      extrasType: null,
      extrasRuns: 0,
      isWicket: false
    });

    if (res.isOverEnded && !res.isMatchEnded && !res.isInningsEnded) {
      setPendingBall({ runs, extrasType: null, extrasRuns: 0, isWicket: false });
      setShowChangeBowlerModal(true);
      updateMatch(res.updatedMatch, res.celebration);
    } else {
      updateMatch(res.updatedMatch, res.celebration);
    }
  };

  // Submit Wide / No Ball / Bye / Leg Bye
  const handleExtraSubmit = (extrasType: ExtraType, extrasRuns: number) => {
    sounds.playTap();
    setActiveBottomSheet(null);

    const res = recordBall(match, {
      runsScored: 0,
      extrasType,
      extrasRuns,
      isWicket: false
    });

    if (res.isOverEnded && !res.isMatchEnded && !res.isInningsEnded) {
      setShowChangeBowlerModal(true);
    }

    updateMatch(res.updatedMatch, res.celebration);
  };

  // Submit OUT
  const handleOutSubmit = (outType: OutType, runs: number = 0) => {
    sounds.playTap();
    setSelectedOutType(outType);

    setPendingBall({
      runsScored: 0,
      extrasType: null,
      extrasRuns: 0,
      isWicket: true,
      wicketType: outType,
      runOutRuns: runs
    });

    setActiveBottomSheet(null);
    setShowNewBatsmanModal(true);
  };

  // Umpire Control Action Execution (Drinks, Innings, End Match)
  const executeControlAction = (action: 'drinks' | 'innings' | 'end') => {
    sounds.playTap();
    setShowMatchControls(false);

    if (action === 'drinks') {
      setIsDrinksBreak(!isDrinksBreak);
    } else if (action === 'innings') {
      const targetRuns = match.scoreA + 1;
      const updated: MatchData = {
        ...match,
        currentInnings: 2,
        targetRuns,
        battingTeam: match.teamB,
        bowlingTeam: match.teamA,
        strikerName: `${match.teamB} Batsman 1`,
        strikerRuns: 0,
        strikerBalls: 0,
        nonStrikerName: `${match.teamB} Batsman 2`,
        nonStrikerRuns: 0,
        nonStrikerBalls: 0,
        bowlerName: `${match.teamA} Bowler 1`,
        bowlerOvers: 0,
        bowlerRuns: 0,
        bowlerWickets: 0,
        bowlerLegalBalls: 0,
        ballEvents: []
      };
      updateMatch(updated);
    } else if (action === 'end') {
      let resultSummary = match.resultSummary;
      if (!resultSummary) {
        if (match.currentInnings === 2) {
          if (match.scoreB >= (match.targetRuns || match.scoreA + 1)) {
            resultSummary = `${match.teamB} Won by ${10 - match.wicketsB} Wickets`;
          } else if (match.scoreA > match.scoreB) {
            resultSummary = `${match.teamA} Won by ${match.scoreA - match.scoreB} Runs`;
          } else {
            resultSummary = 'Match Tied';
          }
        } else {
          resultSummary = `${match.teamA} Innings Completed (${match.scoreA}/${match.wicketsA})`;
        }
      }

      const updated: MatchData = {
        ...match,
        status: 'finished',
        resultSummary,
        updatedAt: Date.now()
      };
      updateMatch(updated);
    }
  };

  // Confirm New Batsman
  const confirmNewBatsman = () => {
    sounds.playTap();
    if (!pendingBall) return;

    const newName = newBatsmanInput.trim() || `Batsman ${isSecondInnings ? match.wicketsB + 2 : match.wicketsA + 2}`;

    const res = recordBall(match, {
      ...pendingBall,
      newBatsmanName: newName
    });

    setShowNewBatsmanModal(false);
    setNewBatsmanInput('');

    if (res.isOverEnded && !res.isMatchEnded && !res.isInningsEnded) {
      setShowChangeBowlerModal(true);
    }

    updateMatch(res.updatedMatch, res.celebration);
    setPendingBall(null);
  };

  // Confirm Change Bowler
  const confirmChangeBowler = () => {
    sounds.playTap();
    const bowlerName = newBowlerInput.trim() || `Bowler ${(isSecondInnings ? match.legalBallsB : match.legalBallsA) / 6 + 1}`;
    
    const updated = {
      ...match,
      bowlerName,
      bowlerOvers: 0,
      bowlerRuns: 0,
      bowlerWickets: 0,
      bowlerLegalBalls: 0
    };

    setShowChangeBowlerModal(false);
    setNewBowlerInput('');
    updateMatch(updated);
  };

  // Swap Striker & Non-Striker manually
  const handleSwapStriker = () => {
    sounds.playTap();
    const updated: MatchData = {
      ...match,
      strikerName: match.nonStrikerName,
      strikerRuns: match.nonStrikerRuns,
      strikerBalls: match.nonStrikerBalls,
      nonStrikerName: match.strikerName,
      nonStrikerRuns: match.strikerRuns,
      nonStrikerBalls: match.strikerBalls
    };
    updateMatch(updated);
  };

  // Undo Last Ball
  const handleUndo = () => {
    sounds.playTap();
    const undone = undoLastBall(match);
    updateMatch(undone);
  };

  // Save Player Name Edit
  const handleSavePlayerName = () => {
    if (!editPlayerTarget || !editPlayerInput.trim()) return;
    const name = editPlayerInput.trim();
    const updated = { ...match };

    if (editPlayerTarget === 'striker') updated.strikerName = name;
    if (editPlayerTarget === 'nonStriker') updated.nonStrikerName = name;
    if (editPlayerTarget === 'bowler') updated.bowlerName = name;

    setEditPlayerTarget(null);
    setEditPlayerInput('');
    updateMatch(updated);
  };

  // Innings metrics calculation
  const isSecondInnings = match.currentInnings === 2;
  const currentTeam = match.battingTeam;
  const bowlingTeam = match.bowlingTeam;
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

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#05070D] text-white p-3.5 select-none relative overflow-y-auto font-['Inter']">

      {/* 1. Appbar with ⋮ Toggle 3 Dots Button for Umpire Controls */}
      <div className="appbar">
        <div className="appbar-left">
          <button onClick={onBack} className="back">←</button>
        </div>
        <div className="match-name">{match.matchName}</div>
        <div className="appbar-left" style={{ justifyContent: 'flex-end', gap: '6px' }}>
          <div className="live-badge">
            <span className="live-dot"></span>
            <span className="live-text">LIVE</span>
          </div>

          {/* Toggle 3 Dots Menu Button ⋮ */}
          <button
            onClick={() => { sounds.playTap(); setShowMatchControls(true); }}
            className="p-1.5 bg-white/5 border border-white/10 text-gray-300 text-xs font-bold rounded-xl hover:text-white btn-material"
            title="Match Controls"
          >
            ⋮
          </button>
        </div>
      </div>

      {/* 2. Score Card (score-card2) */}
      <div className="score-card2">
        <div className="score-top">
          <div className="score-num2">
            <RollingNumber value={score} /><span>/<RollingNumber value={wickets} /></span>
          </div>
          <div className="crr-block">
            <div className="crr-num2">{crr}</div>
            <div className="crr-label2">CRR</div>
          </div>
        </div>

        <div className="score-sub2">
          Overs {overs} / {match.totalOvers} &nbsp;&middot;&nbsp; {currentTeam} vs {bowlingTeam}
        </div>

        {/* Drinks Break Persistent Banner */}
        {isDrinksBreak && (
          <div
            onClick={() => executeControlAction('drinks')}
            className="mt-2.5 bg-amber-500/20 border border-amber-500/50 rounded-xl p-2.5 text-center text-xs font-bold text-amber-300 cursor-pointer animate-pulse"
          >
            ⏸ Drinks Break — tap to resume scoring
          </div>
        )}

        {isSecondInnings && (
          <div className="target-banner2">
            Target {target} &nbsp;&middot;&nbsp; Need {Math.max(0, runsNeeded)} off {Math.max(0, remainingBalls)} balls &nbsp;&middot;&nbsp; RRR {rrr}
          </div>
        )}
      </div>

      {/* 3. Pill Tabs 2 (pill-tabs2) */}
      <div className="pill-tabs2">
        <div
          className="pill-indicator2"
          style={{ transform: activeTab === 'scoring' ? 'translateX(0)' : 'translateX(100%)' }}
        ></div>
        <div
          onClick={() => setActiveTab('scoring')}
          className={`pill-tab2 ${activeTab === 'scoring' ? 'active' : ''}`}
        >
          Live scoring
        </div>
        <div
          onClick={() => setActiveTab('stats')}
          className={`pill-tab2 ${activeTab === 'stats' ? 'active' : ''}`}
        >
          Graphs &amp; stats
        </div>
      </div>

      {activeTab === 'scoring' ? (
        <>
          {/* 4. Batting Card */}
          <div className="card">
            <div className="card-title2" style={{ marginBottom: '10px' }}>Batting</div>

            {/* Striker Row */}
            <div className="bat-row2">
              <div className="bat-name-wrap">
                <div className="avatar">{match.strikerName.substring(0, 2).toUpperCase()}</div>
                <div
                  onClick={() => { setEditPlayerTarget('striker'); setEditPlayerInput(match.strikerName); }}
                  className="bat-name cursor-pointer hover:text-blue-400"
                >
                  {match.strikerName}
                </div>
                <span className="star">★</span>
              </div>
              <div className="bat-stats">
                <b>{match.strikerRuns}</b> ({match.strikerBalls}) &nbsp;SR <b>{strikerSR}</b>
              </div>
            </div>

            {/* Non-Striker Row */}
            <div className="bat-row2">
              <div className="bat-name-wrap">
                <div className="avatar" style={{ background: 'linear-gradient(135deg,#9333EA,#2962FF)' }}>
                  {match.nonStrikerName.substring(0, 2).toUpperCase()}
                </div>
                <div
                  onClick={() => { setEditPlayerTarget('nonStriker'); setEditPlayerInput(match.nonStrikerName); }}
                  className="bat-name cursor-pointer hover:text-blue-400"
                >
                  {match.nonStrikerName}
                </div>
              </div>
              <div className="bat-stats">
                <b>{match.nonStrikerRuns}</b> ({match.nonStrikerBalls}) &nbsp;SR <b>{nonStrikerSR}</b>
              </div>
            </div>

            <button onClick={handleSwapStriker} className="swap-btn2 btn-material">
              ⇄ Swap Strike
            </button>
          </div>

          {/* 5. Bowler Card */}
          <div className="card">
            <div className="bat-row2">
              <div className="bat-name-wrap">
                <div className="avatar" style={{ background: 'rgba(147,51,234,0.3)', border: '1px solid #9333EA' }}>
                  {match.bowlerName.substring(0, 2).toUpperCase()}
                </div>
                <div
                  onClick={() => { setEditPlayerTarget('bowler'); setEditPlayerInput(match.bowlerName); }}
                  className="bat-name cursor-pointer hover:text-blue-400"
                >
                  {match.bowlerName}
                </div>
              </div>
              <div className="bat-stats">
                <b>{match.bowlerOvers}</b> Ov &nbsp;&middot;&nbsp; <b>{match.bowlerRuns}</b> R &nbsp;&middot;&nbsp; <b style={{ color: '#FF5470' }}>{match.bowlerWickets}</b> W
              </div>
            </div>
          </div>

          {/* 6. This Over Card */}
          <div className="card">
            <div className="over-head">
              <div className="card-title2">This over</div>
              <div onClick={() => setShowOverBreakdown(true)} className="over-link cursor-pointer hover:underline">
                Breakdown ›
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {match.ballEvents.length === 0 ? (
                <span style={{ fontSize: '11.5px', color: '#5A6072', fontStyle: 'italic' }}>No deliveries yet</span>
              ) : (
                match.ballEvents.slice(0, 8).map((evt) => {
                  let cls = 'c' + evt.runsScored;
                  let label = `${evt.totalBallRuns}`;

                  if (evt.isWicket) {
                    cls = 'cW';
                    label = 'W';
                  } else if (evt.extrasType === 'wide') {
                    cls = 'cWd';
                    label = evt.extrasRuns > 0 ? `Wd+${evt.extrasRuns}` : 'Wd';
                  } else if (evt.extrasType === 'no_ball') {
                    cls = 'cNb';
                    label = evt.extrasRuns > 0 ? `Nb+${evt.extrasRuns}` : 'Nb';
                  } else if (evt.runsScored === 0) {
                    cls = 'c0';
                    label = '•';
                  }

                  return (
                    <div key={evt.id} className={`chip-demo ${cls} shadow`}>
                      {label}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 7. Scoring Pad with Undo circular button */}
          <div className="card" style={{ marginBottom: '8px' }}>
            <div className="card-title2" style={{ marginBottom: '12px' }}>
              Scoring pad &mdash; tap a run
            </div>

            <div className="pad-grid">
              <button className="pad-btn n0" data-run="0" onClick={(e) => handleScoreTap(0, e)}>0</button>
              <button className="pad-btn n1" data-run="1" onClick={(e) => handleScoreTap(1, e)}>1</button>
              <button className="pad-btn n2" data-run="2" onClick={(e) => handleScoreTap(2, e)}>2</button>
              <button className="pad-btn n3" data-run="3" onClick={(e) => handleScoreTap(3, e)}>3</button>
              <button className="pad-btn n4" data-run="4" onClick={(e) => handleScoreTap(4, e)}>4</button>
              <button className="pad-btn n6" data-run="6" onClick={(e) => handleScoreTap(6, e)}>6</button>
              <button className="pad-btn nOUT" data-run="OUT" onClick={() => setActiveBottomSheet('out')}>OUT</button>
              <button className="pad-btn nUndo" data-run="Undo" onClick={handleUndo}>Undo</button>
            </div>

            <div className="extras-row">
              <div className="extra-btn cursor-pointer btn-material" onClick={() => setActiveBottomSheet('wide')}>Wide</div>
              <div className="extra-btn cursor-pointer btn-material" onClick={() => setActiveBottomSheet('no_ball')}>No ball</div>
              <div className="extra-btn cursor-pointer btn-material" onClick={() => setActiveBottomSheet('bye')}>Bye</div>
              <div className="extra-btn cursor-pointer btn-material" onClick={() => setActiveBottomSheet('leg_bye')}>Leg bye</div>
            </div>
          </div>
        </>
      ) : (
        /* Analytics & Graphs Tab */
        <div className="flex-1 overflow-y-auto py-2">
          <StatCharts match={match} />
        </div>
      )}

      {/* UMPIRE MATCH CONTROLS MODAL */}
      {showMatchControls && (
        <div className="absolute inset-0 bottom-sheet-overlay z-50 flex flex-col justify-end animate-scale-up">
          <div className="controls-sheet w-full max-w-sm mx-auto">
            <div className="controls-header">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-2 opacity-60"></div>
              <h3 className="controls-title">Match controls</h3>
            </div>

            {/* Row 1: Drinks Break (Neutral) */}
            <div
              onClick={() => {
                setSelectedControlAction('drinks');
                executeControlAction('drinks');
              }}
              className={`control-row neutral cursor-pointer ${selectedControlAction === 'drinks' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="control-icon">☕</div>
              <div className="min-w-0">
                <div className="control-title text-white contain-text">Drinks break</div>
                <div className="control-sub contain-text">Pause match clock &amp; banner</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  executeControlAction('drinks');
                }}
                className="control-action-btn btn-material cursor-pointer"
              >
                {isDrinksBreak ? 'Resume' : 'Pause'}
              </div>
            </div>

            {/* Row 2: Innings Break (Caution) */}
            <div
              onClick={() => {
                setSelectedControlAction('innings');
                executeControlAction('innings');
              }}
              className={`control-row caution cursor-pointer ${selectedControlAction === 'innings' ? 'ring-2 ring-amber-500' : ''}`}
            >
              <div className="control-icon">🔄</div>
              <div className="min-w-0">
                <div className="control-title text-amber-300 contain-text">Innings break</div>
                <div className="control-sub contain-text">End 1st innings, start 2nd</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  executeControlAction('innings');
                }}
                className="control-action-btn btn-material cursor-pointer"
              >
                Start 2nd
              </div>
            </div>

            {/* Row 3: End Match (Danger) */}
            <div
              onClick={() => {
                setSelectedControlAction('end');
                executeControlAction('end');
              }}
              className={`control-row danger cursor-pointer ${selectedControlAction === 'end' ? 'ring-2 ring-red-500' : ''}`}
            >
              <div className="control-icon">🏁</div>
              <div className="min-w-0">
                <div className="control-title text-red-400 contain-text">End match</div>
                <div className="control-sub contain-text">Finish &amp; generate final result</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  executeControlAction('end');
                }}
                className="control-action-btn btn-material cursor-pointer"
              >
                End
              </div>
            </div>

            {/* Paired Footer Buttons */}
            <div className="controls-footer">
              <button
                onClick={() => {
                  setShowMatchControls(false);
                }}
                className="controls-cancel btn-material"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeControlAction(selectedControlAction || 'end');
                }}
                className="controls-ok btn-material"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVER BREAKDOWN MODAL */}
      {showOverBreakdown && (
        <OverBreakdownModal
          match={match}
          onClose={() => setShowOverBreakdown(false)}
        />
      )}

      {/* EXTRAS BOTTOM SHEET MODALS */}
      {activeBottomSheet && (
        <div className="absolute inset-0 bottom-sheet-overlay z-50 flex flex-col justify-end animate-scale-up">
          <div className="bg-[#111827] border-t-2 border-blue-500/60 rounded-t-[32px] p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-1 opacity-70"></div>

            {/* Wide / No Ball Runs */}
            {(activeBottomSheet === 'wide' || activeBottomSheet === 'no_ball') && (
              <div className="text-center space-y-3">
                <h3 className="text-lg font-bold text-white capitalize">
                  Select {activeBottomSheet === 'wide' ? 'Wide' : 'No Ball'} Additional Runs
                </h3>
                <p className="text-xs text-gray-400">
                  Base 1 run is automatically added. Select extra runs off bat/overthrow:
                </p>
                <div className="grid grid-cols-4 gap-2.5 pt-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((extra) => (
                    <button
                      key={extra}
                      onClick={() => handleExtraSubmit(activeBottomSheet, extra)}
                      className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl btn-material shadow"
                    >
                      +{extra} {extra === 0 ? '(Just 1)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bye / Leg Bye Runs */}
            {(activeBottomSheet === 'bye' || activeBottomSheet === 'leg_bye') && (
              <div className="text-center space-y-3">
                <h3 className="text-lg font-bold text-white capitalize">
                  Select {activeBottomSheet === 'bye' ? 'Bye' : 'Leg Bye'} Runs
                </h3>
                <p className="text-xs text-gray-400">Counts as a legal delivery:</p>
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  {[1, 2, 3, 4, 5, 6].map((runs) => (
                    <button
                      key={runs}
                      onClick={() => handleExtraSubmit(activeBottomSheet, runs)}
                      className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-2xl btn-material shadow"
                    >
                      {runs} {runs === 1 ? 'Run' : 'Runs'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OUT Type Selection Sheet */}
            {activeBottomSheet === 'out' && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-red-400 text-center">Select Wicket Out Type</h3>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
                  {(['bowled', 'caught', 'run_out', 'lbw', 'stumped', 'hit_wicket', 'retired_out'] as OutType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (type === 'run_out') {
                          setSelectedOutType('run_out');
                        } else {
                          handleOutSubmit(type, 0);
                        }
                      }}
                      className="py-3.5 px-4 bg-gray-800 hover:bg-red-950/80 hover:border-red-500 border border-gray-700 rounded-2xl text-xs font-bold text-white capitalize transition text-left flex justify-between items-center btn-material"
                    >
                      <span>{type.replace('_', ' ')}</span>
                      {type === 'run_out' && <span className="text-[10px] text-amber-400">►</span>}
                    </button>
                  ))}
                </div>

                {/* If Run Out selected, ask completed runs */}
                {selectedOutType === 'run_out' && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                    <p className="text-xs text-amber-400 font-semibold text-center">Runs Completed Before Run Out?</p>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleOutSubmit('run_out', r)}
                          className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl btn-material"
                        >
                          {r} {r === 1 ? 'Run' : 'Runs'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { setActiveBottomSheet(null); setSelectedOutType(null); }}
              className="w-full py-3 bg-gray-800 text-gray-400 font-semibold text-xs rounded-2xl hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NEW BATSMAN MODAL */}
      {showNewBatsmanModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-scale-up">
          <div className="w-full max-w-sm bg-[#111827] border-2 border-red-500/60 rounded-[28px] p-5 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white text-center">WICKET! Enter New Batsman</h3>
            <p className="text-xs text-gray-400 text-center">Name of next batsman coming to the crease:</p>

            <input
              type="text"
              value={newBatsmanInput}
              onChange={(e) => setNewBatsmanInput(e.target.value)}
              placeholder="e.g. Vikram"
              autoFocus
              className="w-full bg-[#05070D] border border-blue-500/50 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-blue-400 outline-none"
            />

            <button
              onClick={confirmNewBatsman}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition shadow-md btn-material"
            >
              Confirm New Batsman
            </button>
          </div>
        </div>
      )}

      {/* CHANGE BOWLER MODAL (AT END OF OVER) */}
      {showChangeBowlerModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-scale-up">
          <div className="w-full max-w-sm bg-[#111827] border-2 border-blue-500/60 rounded-[28px] p-5 space-y-4 shadow-2xl">
            <div className="text-center">
              <span className="px-3 py-1 bg-blue-600/30 text-blue-400 font-bold text-xs rounded-full uppercase tracking-wider">
                End of Over
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Enter Next Bowler</h3>
              <p className="text-xs text-gray-400 mt-1">Name of bowler for the next over:</p>
            </div>

            <input
              type="text"
              value={newBowlerInput}
              onChange={(e) => setNewBowlerInput(e.target.value)}
              placeholder="e.g. Suresh"
              autoFocus
              className="w-full bg-[#05070D] border border-blue-500/50 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-blue-400 outline-none"
            />

            <button
              onClick={confirmChangeBowler}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl transition shadow-md btn-material"
            >
              Start Next Over
            </button>
          </div>
        </div>
      )}

      {/* EDIT PLAYER NAME MODAL */}
      {editPlayerTarget && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-scale-up">
          <div className="w-full max-w-sm bg-[#111827] border border-gray-700 rounded-[28px] p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white text-center capitalize">Edit {editPlayerTarget} Name</h3>

            <input
              type="text"
              value={editPlayerInput}
              onChange={(e) => setEditPlayerInput(e.target.value)}
              autoFocus
              className="w-full bg-[#05070D] border border-gray-700 rounded-2xl px-4 py-2.5 text-sm font-bold text-white focus:border-blue-400 outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setEditPlayerTarget(null)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-400 text-xs font-bold rounded-2xl btn-material"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlayerName}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl btn-material"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
