import React from 'react';
import { X, Layers } from 'lucide-react';
import type { BallEvent, MatchData } from '../types';

interface Props {
  match: MatchData;
  onClose: () => void;
}

interface OverGroup {
  overNumber: number;
  bowlerName: string;
  balls: BallEvent[];
  totalRuns: number;
  wickets: number;
  batsmenSet: Set<string>;
}

export const OverBreakdownModal: React.FC<Props> = ({ match, onClose }) => {
  const overGroups: OverGroup[] = [];

  const currentInningsEvents = match.ballEvents.filter(
    (b) => b.innings === match.currentInnings
  );

  // Sort chronologically for calculation
  const sortedEvents = [...currentInningsEvents].sort((a, b) => a.timestamp - b.timestamp);

  sortedEvents.forEach((evt) => {
    let group = overGroups.find((g) => g.overNumber === evt.overNumber);
    if (!group) {
      group = {
        overNumber: evt.overNumber,
        bowlerName: evt.bowlerName,
        balls: [],
        totalRuns: 0,
        wickets: 0,
        batsmenSet: new Set<string>(),
      };
      overGroups.push(group);
    }
    group.balls.push(evt);
    group.totalRuns += evt.totalBallRuns;
    if (evt.isWicket) group.wickets += 1;
    if (evt.batsmanName) group.batsmenSet.add(evt.batsmanName);
  });

  // Display newest overs first (reverse chronological)
  overGroups.reverse();

  // Clean single-source subtitle (no placeholder concatenation)
  const breakdownSubtitle = `Innings ${match.currentInnings} · ${match.battingTeam}`;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end justify-center animate-scale-up select-none p-3">
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-[28px] p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
          <div className="breakdown-header">
            <h3 className="breakdown-title flex items-center gap-2">
              <Layers size={18} className="text-blue-400 shrink-0" /> Over-wise breakdown
            </h3>
            <p className="breakdown-subtitle">{breakdownSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-full transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Overs List (Reverse Chronological) */}
        <div className="breakdown-list flex-1">
          {overGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 italic text-xs">
              No overs bowled yet in this innings.
            </div>
          ) : (
            overGroups.map((group) => {
              const batsmenArray = Array.from(group.batsmenSet);

              return (
                <div key={group.overNumber} className="breakdown-over-card">
                  {/* Header Row: Over #, Bowler Name, Totals */}
                  <div className="breakdown-over-head">
                    <span className="over-num-badge">
                      Over {group.overNumber + 1}
                    </span>
                    <span className="over-bowler">{group.bowlerName}</span>
                    <span className="over-totals font-mono">
                      {group.totalRuns} runs &nbsp;&middot;&nbsp; {group.wickets} wkts
                    </span>
                  </div>

                  {/* Ball-by-Ball Chip Row */}
                  <div className="breakdown-chips">
                    {group.balls.map((b) => {
                      let cls = 'c' + b.runsScored;
                      let label = `${b.totalBallRuns}`;

                      if (b.isWicket) {
                        cls = 'cW';
                        label = 'W';
                      } else if (b.extrasType === 'wide') {
                        cls = 'cWd';
                        label = b.extrasRuns > 0 ? `Wd+${b.extrasRuns}` : 'Wd';
                      } else if (b.extrasType === 'no_ball') {
                        cls = 'cNb';
                        label = b.extrasRuns > 0 ? `Nb+${b.extrasRuns}` : 'Nb';
                      } else if (b.runsScored === 0) {
                        cls = 'c0';
                        label = '•';
                      }

                      return (
                        <div key={b.id} className={`chip-demo ${cls} shadow !w-7 !h-7 !text-[11px]`}>
                          {label}
                        </div>
                      );
                    })}
                  </div>

                  {/* Batsmen Involved Row */}
                  <div className="breakdown-batsmen">
                    Batsmen: {batsmenArray.length > 0 ? batsmenArray.join(', ') : 'N/A'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Footer Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl transition shrink-0 btn-material"
        >
          Close breakdown
        </button>
      </div>
    </div>
  );
};
