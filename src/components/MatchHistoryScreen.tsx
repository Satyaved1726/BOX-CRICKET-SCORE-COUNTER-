import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Search, Trash2, Calendar, Trophy, Zap, Crown, Shield, Flame, Star, Package, X } from 'lucide-react';
import type { MatchData } from '../types';
import { getMatchHistory, clearMatchHistory, deleteMatch } from '../lib/supabase';
import { OverBreakdownModal } from './OverBreakdownModal';
import { sounds } from '../lib/audio';

interface Props {
  onBack: () => void;
  onOpenMatch?: (match: MatchData) => void;
}

export const MatchHistoryScreen: React.FC<Props> = ({ onBack, onOpenMatch }) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const list = await getMatchHistory();
    setMatches(list);
  };

  const handleConfirmClearAll = async () => {
    sounds.playTap();
    await clearMatchHistory();
    setMatches([]);
    setShowClearConfirmModal(false);
  };

  const handleDeleteSingleMatch = async (e: React.MouseEvent, m: MatchData) => {
    e.stopPropagation();
    sounds.playTap();
    await deleteMatch(m.id, m.roomCode);
    setMatches((prev) => prev.filter((item) => item.id !== m.id && item.roomCode !== m.roomCode));
  };

  const handleSelectMatch = (m: MatchData) => {
    sounds.playTap();
    if (onOpenMatch) {
      onOpenMatch(m);
    } else {
      setSelectedMatch(m);
    }
  };

  const filtered = matches.filter(
    (m) =>
      m.teamA.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.teamB.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.matchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tournamentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.roomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Icon selector per team index
  const getTeamIcon = (index: number) => {
    const icons = [
      <Zap key="1" size={20} className="text-white" />,
      <Crown key="2" size={20} className="text-white" />,
      <Shield key="3" size={20} className="text-white" />,
      <Flame key="4" size={20} className="text-white" />,
      <Star key="5" size={20} className="text-white" />
    ];
    return icons[index % icons.length];
  };

  return (
    <div className="flex-1 flex flex-col bg-[#05070D] text-white p-4 select-none overflow-y-auto font-['Inter'] relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition btn-material"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[28px] font-black text-white tracking-tight leading-none">Match History</h1>
        </div>

        {matches.length > 0 && (
          <button
            onClick={() => { sounds.playTap(); setShowClearConfirmModal(true); }}
            className="p-2 bg-red-950/40 border border-red-500/30 hover:border-red-500 text-red-400 rounded-xl transition btn-material shrink-0 flex items-center gap-1.5"
            title="Clear All History"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Sticky Search Bar with 24dp (mb-6) Gap Below */}
      {matches.length > 0 && (
        <div className="sticky top-0 z-20 pb-2 pt-1 bg-[#05070D] mb-6 shrink-0">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Team, Tournament or Room Code"
              className="w-full h-[56px] bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 transition shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Match Cards List with 20dp (space-y-5) Gap Between Matches */}
      <div className="flex-1 overflow-y-auto space-y-5 pt-1 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xl">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">No Match History Yet</h3>
            <p className="text-xs text-gray-400 max-w-xs">
              Start your first match to see it here.
            </p>
          </div>
        ) : (
          filtered.map((m) => {
            const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            // Clean single-source strings
            const cleanTeamA = m.teamA || 'Team A';
            const cleanTeamB = m.teamB || 'Team B';
            const cleanTournament = m.tournamentName || 'Box Cricket League';
            const cleanMatchTitle = m.matchName || 'Match 1';

            let resultText = m.status === 'finished' ? 'Match Completed' : 'LIVE MATCH';
            if (m.resultSummary) {
              resultText = m.resultSummary;
            } else if (m.scoreA > m.scoreB && m.currentInnings === 2) {
              resultText = `${cleanTeamA} Won by ${m.scoreA - m.scoreB} Runs`;
            } else if (m.scoreB > m.scoreA && m.currentInnings === 2) {
              resultText = `${cleanTeamB} Won by ${10 - m.wicketsB} Wickets`;
            }

            return (
              <div
                key={m.id}
                onClick={() => handleSelectMatch(m)}
                className="bg-[#111827] border border-white/10 rounded-[20px] p-5 space-y-4 cursor-pointer hover:border-blue-500/50 btn-material shadow-xl transition mb-5 relative group"
              >
                {/* Top Row: Tournament Info, Room Code Badge & Individual Delete Button */}
                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                      <Trophy size={14} className="shrink-0" />
                      <span className="truncate">{cleanTournament}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 font-medium truncate">
                      {cleanMatchTitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-white/10 text-white font-mono text-xs font-bold rounded-lg border border-white/10">
                        {m.roomCode}
                      </span>
                      <div className="text-[11px] text-gray-400 mt-1 font-medium">{dateStr}</div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSingleMatch(e, m)}
                      className="p-1.5 bg-red-950/40 border border-red-500/30 hover:border-red-500 text-red-400 rounded-lg transition btn-material"
                      title="Delete Match"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Center Graphic Teams & Score Breakdown */}
                <div className="grid grid-cols-5 items-center gap-2 py-1">
                  {/* Team A */}
                  <div className="col-span-2 flex flex-col items-center text-center space-y-1.5 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md border border-blue-400/50">
                      {getTeamIcon(0)}
                    </div>
                    <div className="text-xs font-bold text-white truncate w-full px-1">
                      {cleanTeamA}
                    </div>
                    <div className="bg-[#05070D] border border-white/10 rounded-xl px-3 py-1.5 text-center w-full">
                      <div className="text-base font-black font-mono text-white">{m.scoreA}/{m.wicketsA}</div>
                      <div className="text-[10px] text-gray-400 font-medium">({m.oversA} Ov)</div>
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="col-span-1 flex flex-col items-center justify-center text-gray-500 text-xs font-black">
                    <span>VS</span>
                  </div>

                  {/* Team B */}
                  <div className="col-span-2 flex flex-col items-center text-center space-y-1.5 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md border border-purple-400/50">
                      {getTeamIcon(1)}
                    </div>
                    <div className="text-xs font-bold text-white truncate w-full px-1">
                      {cleanTeamB}
                    </div>
                    <div className="bg-[#05070D] border border-white/10 rounded-xl px-3 py-1.5 text-center w-full">
                      <div className="text-base font-black font-mono text-white">{m.scoreB}/{m.wicketsB}</div>
                      <div className="text-[10px] text-gray-400 font-medium">({m.oversB} Ov)</div>
                    </div>
                  </div>
                </div>

                {/* Result Pill Badge */}
                <div className="flex justify-center pt-1">
                  <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono py-1.5 px-4 rounded-xl text-center shadow">
                    {resultText}
                  </div>
                </div>

                {/* Footer: Calendar & View Scorecard */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar size={14} />
                    <span>View Scorecard</span>
                  </div>
                  <div className="text-blue-400 flex items-center gap-1">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-scale-up">
          <div className="w-full max-w-sm bg-[#111827] border-2 border-red-500/60 rounded-[28px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Trash2 size={20} />
                <span>Clear All History</span>
              </div>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-300 text-center leading-relaxed">
              Are you sure you want to delete all match history? This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-2xl btn-material"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-2xl transition shadow-md btn-material"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over Breakdown Modal */}
      {selectedMatch && (
        <OverBreakdownModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};
