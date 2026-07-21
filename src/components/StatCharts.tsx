import React from 'react';
import type { MatchData } from '../types';
import { calculateCRR } from '../lib/scoring';

interface Props {
  match: MatchData;
}

export const StatCharts: React.FC<Props> = ({ match }) => {
  const currentEvents = match.ballEvents.filter((b) => b.innings === match.currentInnings);

  // 1. Run Distribution calculation
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 6: 0, extras: 0 };
  let totalLegalBalls = 0;

  currentEvents.forEach((b) => {
    if (b.isLegalDelivery) totalLegalBalls += 1;
    if (b.extrasType) {
      dist.extras += 1;
    } else if (b.runsScored in dist) {
      dist[b.runsScored as keyof typeof dist] += 1;
    }
  });

  const maxVal = Math.max(1, ...Object.values(dist));

  // 2. Runs per Over calculation
  const oversMap: { [key: number]: number } = {};
  for (let i = 0; i < match.totalOvers; i++) {
    oversMap[i] = 0;
  }
  currentEvents.forEach((b) => {
    if (b.overNumber in oversMap) {
      oversMap[b.overNumber] += b.totalBallRuns;
    }
  });
  const maxOverRuns = Math.max(6, ...Object.values(oversMap));

  // 3. Analytics metrics
  const isSecondInnings = match.currentInnings === 2;
  const currentScore = isSecondInnings ? match.scoreB : match.scoreA;
  const legalBalls = isSecondInnings ? match.legalBallsB : match.legalBallsA;
  const totalBalls = match.totalOvers * 6;

  const crr = calculateCRR(currentScore, legalBalls);

  const boundaryRuns = currentEvents
    .filter((b) => b.runsScored === 4 || b.runsScored === 6)
    .reduce((acc, b) => acc + b.totalBallRuns, 0);
  const boundaryPct = currentScore > 0 ? Math.round((boundaryRuns / currentScore) * 100) : 0;
  const dotBallPct = totalLegalBalls > 0 ? Math.round((dist[0] / totalLegalBalls) * 100) : 0;
  const projectedScore = legalBalls > 0 ? Math.round((currentScore / legalBalls) * totalBalls) : 0;
  const currentPartnership = match.strikerRuns + match.nonStrikerRuns;

  return (
    <div className="space-y-4 text-white select-none">
      {/* 2-Column KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 space-y-1 shadow-md">
          <span className="text-xs text-gray-400 font-extrabold uppercase tracking-wider block">CURRENT RR</span>
          <span className="text-3xl font-black font-mono text-blue-400">{crr}</span>
          <span className="text-xs text-gray-500 block">Runs per over</span>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 space-y-1 shadow-md">
          <span className="text-xs text-gray-400 font-extrabold uppercase tracking-wider block">PROJECTED SCORE</span>
          <span className="text-3xl font-black font-mono text-amber-400">{projectedScore}</span>
          <span className="text-xs text-gray-500 block">In {match.totalOvers} overs</span>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 space-y-1 shadow-md">
          <span className="text-xs text-gray-400 font-extrabold uppercase tracking-wider block">DOT BALL %</span>
          <span className="text-3xl font-black font-mono text-purple-400">{dotBallPct}%</span>
          <span className="text-xs text-gray-500 block">{dist[0]} dot balls</span>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 space-y-1 shadow-md">
          <span className="text-xs text-gray-400 font-extrabold uppercase tracking-wider block">PARTNERSHIP</span>
          <span className="text-3xl font-black font-mono text-emerald-400">{currentPartnership}</span>
          <span className="text-xs text-gray-500 block">Active wicket</span>
        </div>
      </div>

      {/* Graph Card 1: Runs Per Over (Min Height 140px) */}
      <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4.5 shadow-md space-y-3 min-h-[160px]">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
            Runs Per Over Chart
          </h4>
          <span className="text-xs text-gray-400 font-mono">Innings {match.currentInnings}</span>
        </div>

        <div className="h-36 flex items-end justify-between gap-2.5 pt-4 pb-2 px-1">
          {Object.entries(oversMap).map(([overNum, runs]) => {
            const pct = Math.max(8, Math.round((runs / maxOverRuns) * 100));
            return (
              <div key={overNum} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-xs font-bold text-gray-200 font-mono">{runs}</span>
                <div className="w-full bg-gray-800 rounded-t-xl overflow-hidden flex items-end h-24">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-xl transition-all duration-500 group-hover:from-blue-500 group-hover:to-emerald-400"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono font-semibold">Ov {Number(overNum) + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graph Card 2: Shot Distribution & Boundary Ring Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Shot Distribution Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 space-y-3 shadow-md min-h-[160px]">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 border-b border-gray-800 pb-2">
            Shot Distribution
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Dots (0)', val: dist[0], color: 'bg-gray-600' },
              { label: '1s & 2s', val: dist[1] + dist[2], color: 'bg-blue-500' },
              { label: 'Fours (4)', val: dist[4], color: 'bg-emerald-500' },
              { label: 'Sixes (6)', val: dist[6], color: 'bg-purple-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-0.5">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{item.label}</span>
                  <span className="font-mono font-bold">{item.val}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.round((item.val / maxVal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boundary % Ring Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-[24px] p-4 flex flex-col items-center justify-between text-center shadow-md min-h-[160px]">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 w-full border-b border-gray-800 pb-2">
            Boundary %
          </h4>
          <div className="relative w-22 h-22 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-800 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-400 stroke-current transition-all duration-700"
                strokeDasharray={`${boundaryPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black font-['Poppins'] text-white">{boundaryPct}%</span>
              <span className="text-[9px] text-gray-400 font-bold">RUNS</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            <span className="font-bold text-white">{boundaryRuns}</span> runs from boundaries
          </p>
        </div>
      </div>
    </div>
  );
};
