import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare } from 'lucide-react';
import type { MatchData, CelebrationEvent } from '../types';
import { subscribeToMatch } from '../lib/supabase';
import { calculateCRR, calculateRRR } from '../lib/scoring';
import { CelebrationOverlay } from './CelebrationOverlay';
import { OverBreakdownModal } from './OverBreakdownModal';
import { StatCharts } from './StatCharts';
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
  const [showOverBreakdown, setShowOverBreakdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'live' | 'stats'>('live');

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

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#05070D] text-white p-3.5 select-none relative overflow-y-auto font-['Inter']">
      {/* Celebration animation overlay */}
      <CelebrationOverlay celebration={celebration} onFinish={() => setCelebration(null)} />

      {/* 1. AppBar */}
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
            <span className="live-text">LIVE STREAM</span>
          </div>
          <button
            onClick={toggleSound}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 btn-material"
          >
            {muted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. Score Card */}
      <div className="score-card-demo shrink-0">
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
          <div className="target-banner-demo wrap-text">
            Target: {target} &nbsp;&middot;&nbsp; Need {Math.max(0, runsNeeded)} off {Math.max(0, remainingBalls)} balls (RRR: {rrr})
          </div>
        )}
      </div>

      {/* 3. Pill Tabs Grid */}
      <div className="pill-tabs-grid shrink-0">
        <div
          className="indicator"
          style={{ transform: activeTab === 'live' ? 'translateX(0)' : 'translateX(100%)' }}
        ></div>
        <div
          onClick={() => setActiveTab('live')}
          className={`pill-tab-slot ${activeTab === 'live' ? 'active' : ''}`}
        >
          Live Watch
        </div>
        <div
          onClick={() => setActiveTab('stats')}
          className={`pill-tab-slot ${activeTab === 'stats' ? 'active' : ''}`}
        >
          Match Analytics
        </div>
      </div>

      {activeTab === 'live' ? (
        <>
          {/* 4. Batting Card */}
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
            <div className="row-grid-auto py-1.5">
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
          </div>

          {/* 5. Bowler Card */}
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

          {/* 6. This Over Ball Chips */}
          <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 mb-3 shrink-0 min-w-0">
            <div className="row-grid-auto mb-2.5 pr-2">
              <span className="text-[#8B93A7] text-[11px] font-bold tracking-wider uppercase contain-text">This Over</span>
              <button
                onClick={() => setShowOverBreakdown(true)}
                className="text-xs text-blue-400 font-bold hover:underline shrink-0 pl-2"
              >
                Over Breakdown ►
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {match.ballEvents.length === 0 ? (
                <span className="text-xs text-gray-500 italic">Waiting for bowler...</span>
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

          {/* 7. Live Commentary */}
          <div className="bg-[#111827] border border-white/10 rounded-[20px] p-4 flex flex-col min-h-[150px] mb-2 overflow-hidden shrink-0 shadow-md">
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
        </>
      ) : (
        /* Match Analytics Tab */
        <div className="flex-1 overflow-y-auto py-2">
          <StatCharts match={match} />
        </div>
      )}

      {/* OVER BREAKDOWN MODAL */}
      {showOverBreakdown && (
        <OverBreakdownModal
          match={match}
          onClose={() => setShowOverBreakdown(false)}
        />
      )}
    </div>
  );
};
