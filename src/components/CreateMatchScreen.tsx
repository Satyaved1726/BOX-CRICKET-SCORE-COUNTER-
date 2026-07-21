import React, { useState } from 'react';
import { ArrowLeft, Trophy, Users, Award, Play, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import type { MatchData } from '../types';
import { generateRoomCode, generateUUID, createMatchInSupabase } from '../lib/supabase';
import { sounds } from '../lib/audio';

interface Props {
  onBack: () => void;
  onMatchCreated: (match: MatchData) => void;
}

export const CreateMatchScreen: React.FC<Props> = ({ onBack, onMatchCreated }) => {
  const [tournamentName, setTournamentName] = useState('Box Cricket League');
  const [matchName, setMatchName] = useState('');
  const [turfName, setTurfName] = useState('');
  
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  
  // Overs selection
  const [selectedOvers, setSelectedOvers] = useState<number>(5);
  const [isCustomOvers, setIsCustomOvers] = useState<boolean>(false);
  const [customOversInput, setCustomOversInput] = useState<string>('15');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  const presetsRow1 = [4, 5, 6];
  const presetsRow2 = [8, 10, 12];

  const handleSelectPreset = (ov: number) => {
    sounds.playTap();
    setSelectedOvers(ov);
    setIsCustomOvers(false);
  };

  const handleOpenCustomModal = () => {
    sounds.playTap();
    setShowCustomModal(true);
  };

  const handleApplyCustomOvers = () => {
    sounds.playTap();
    const val = parseInt(customOversInput, 10);
    if (isNaN(val) || val < 1 || val > 50) {
      alert('Please enter a valid overs number between 1 and 50');
      return;
    }
    setSelectedOvers(val);
    setIsCustomOvers(true);
    setShowCustomModal(false);
  };

  const handleStartMatch = async () => {
    sounds.playTap();
    if (!teamA.trim() || !teamB.trim()) {
      alert('Please enter names for both Team A and Team B');
      return;
    }

    const roomCode = generateRoomCode();
    const matchId = generateUUID();

    const newMatch: MatchData = {
      id: matchId,
      roomCode,
      tournamentName: tournamentName.trim() || 'Box Cricket League',
      matchName: matchName.trim() || 'Match 1',
      ground: turfName.trim() || 'Turf Ground',
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      totalOvers: selectedOvers,
      currentInnings: 1,
      battingTeam: teamA.trim(),
      bowlingTeam: teamB.trim(),
      scoreA: 0,
      wicketsA: 0,
      oversA: 0,
      legalBallsA: 0,
      scoreB: 0,
      wicketsB: 0,
      oversB: 0,
      legalBallsB: 0,
      strikerName: 'Batsman 1',
      strikerRuns: 0,
      strikerBalls: 0,
      nonStrikerName: 'Batsman 2',
      nonStrikerRuns: 0,
      nonStrikerBalls: 0,
      bowlerName: 'Bowler 1',
      bowlerOvers: 0,
      bowlerRuns: 0,
      bowlerWickets: 0,
      bowlerLegalBalls: 0,
      ballEvents: [],
      commentary: [],
      status: 'live',
      tossWinner: teamA.trim(),
      tossDecision: 'bat',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const createdMatch = await createMatchInSupabase(newMatch);
    onMatchCreated(createdMatch);
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#05070D] text-white p-4 select-none overflow-y-auto font-['Inter'] relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition btn-material"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[28px] font-black text-white tracking-tight leading-none">Create Match</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">Start a new live box cricket match</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-4 my-1 pb-4">
        {/* 1. Tournament Details Card */}
        <div className="bg-[#111827] border border-white/10 rounded-[20px] p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xs uppercase tracking-wider">
            <Trophy size={18} />
            <span>Tournament Details</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Tournament Name</label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Box Cricket League"
                className="w-full h-[48px] bg-[#05070D] border border-gray-800 focus:border-blue-500 rounded-[14px] px-4 text-sm font-bold text-white placeholder-gray-600 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Match Title</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="e.g. Grand Finale"
                className="w-full h-[48px] bg-[#05070D] border border-gray-800 focus:border-blue-500 rounded-[14px] px-4 text-sm font-bold text-white placeholder-gray-600 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Ground / Turf</label>
              <input
                type="text"
                value={turfName}
                onChange={(e) => setTurfName(e.target.value)}
                placeholder="e.g. Green Park Turf"
                className="w-full h-[48px] bg-[#05070D] border border-gray-800 focus:border-blue-500 rounded-[14px] px-4 text-sm font-bold text-white placeholder-gray-600 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* 2. Team Details Card */}
        <div className="bg-[#111827] border border-white/10 rounded-[20px] p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
            <Users size={18} />
            <span>Team Details</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-blue-400 block mb-1">
                Batting First &nbsp;&bull;&nbsp; Team A
              </label>
              <input
                type="text"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="Enter Team A Name"
                className="w-full h-[48px] bg-[#05070D] border border-blue-500/40 focus:border-blue-400 rounded-[14px] px-4 text-sm font-bold text-white placeholder-gray-600 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-purple-400 block mb-1">
                Bowling First &nbsp;&bull;&nbsp; Team B
              </label>
              <input
                type="text"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="Enter Team B Name"
                className="w-full h-[48px] bg-[#05070D] border border-purple-500/40 focus:border-purple-400 rounded-[14px] px-4 text-sm font-bold text-white placeholder-gray-600 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* 3. Overs Selection Card (64dp Circles: 2 rows × 3 columns) */}
        <div className="bg-[#111827] border border-white/10 rounded-[20px] p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
            <Award size={18} />
            <span>Overs Selection</span>
          </div>

          <div className="flex flex-col items-center gap-4 py-1">
            {/* Row 1: 4, 5, 6 */}
            <div className="flex justify-center gap-6 w-full">
              {presetsRow1.map((ov) => (
                <button
                  key={ov}
                  onClick={() => handleSelectPreset(ov)}
                  className={`w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center font-black text-lg transition-all duration-200 btn-material ${
                    !isCustomOvers && selectedOvers === ov
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(41,98,255,0.7)] border-2 border-blue-400 scale-105'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{ov}</span>
                  <span className="text-[10px] font-semibold opacity-70 -mt-1">Overs</span>
                </button>
              ))}
            </div>

            {/* Row 2: 8, 10, 12 */}
            <div className="flex justify-center gap-6 w-full">
              {presetsRow2.map((ov) => (
                <button
                  key={ov}
                  onClick={() => handleSelectPreset(ov)}
                  className={`w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center font-black text-lg transition-all duration-200 btn-material ${
                    !isCustomOvers && selectedOvers === ov
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(41,98,255,0.7)] border-2 border-blue-400 scale-105'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{ov}</span>
                  <span className="text-[10px] font-semibold opacity-70 -mt-1">Overs</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Overs Card Trigger */}
          <div
            onClick={handleOpenCustomModal}
            className={`flex items-center justify-between p-3.5 rounded-[14px] border cursor-pointer transition-all btn-material ${
              isCustomOvers
                ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                : 'bg-[#05070D] border-gray-800 text-gray-300 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-xl text-blue-400">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Custom Overs</div>
                <div className="text-xs text-gray-400">
                  {isCustomOvers ? `✓ ${selectedOvers} Overs Selected` : 'Enter between 1 to 50 overs'}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* 4. Bottom Pinned CTA Button (Height: 60dp, Radius: 18dp, Gradient: Blue → Cyan) */}
      <div className="pt-3 shrink-0">
        <button
          onClick={handleStartMatch}
          className="w-full h-[60px] rounded-[18px] bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-base flex items-center justify-center gap-2.5 text-center shadow-[0_4px_25px_rgba(41,98,255,0.4)] btn-material"
        >
          <Play size={20} fill="currentColor" className="shrink-0" />
          <span>Start Match &amp; Generate Room Code</span>
        </button>
      </div>

      {/* Custom Overs Bottom Sheet Modal */}
      {showCustomModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end justify-center animate-scale-up p-2">
          <div className="w-full max-w-sm bg-[#111827] border-t-2 border-blue-500 rounded-t-[28px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Custom Overs</h3>
                <p className="text-xs text-gray-400">Enter match overs duration (1 to 50)</p>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 py-2">
              <label className="text-sm font-semibold text-gray-300 block">Enter Number of Overs</label>
              <input
                type="number"
                min="1"
                max="50"
                value={customOversInput}
                onChange={(e) => setCustomOversInput(e.target.value)}
                autoFocus
                placeholder="e.g. 15"
                className="w-full h-[56px] bg-[#05070D] border border-blue-500/60 rounded-2xl px-4 text-xl font-black text-white text-center focus:border-blue-400 outline-none"
              />
            </div>

            <button
              onClick={handleApplyCustomOvers}
              className="w-full h-[56px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl transition shadow-md btn-material"
            >
              Apply Custom Overs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
