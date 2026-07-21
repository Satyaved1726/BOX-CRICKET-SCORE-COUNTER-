import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { CelebrationEvent } from '../types';
import { sounds } from '../lib/audio';

interface Props {
  celebration: CelebrationEvent | null;
  onFinish: () => void;
}

export const CelebrationOverlay: React.FC<Props> = ({ celebration, onFinish }) => {
  useEffect(() => {
    if (!celebration) return;

    const isFour = celebration.type === 'FOUR' || (celebration.type as string) === 'boundary_4';
    const isSix = celebration.type === 'SIX' || (celebration.type as string) === 'six_6';
    const isWicket = celebration.type === 'WICKET' || (celebration.type as string) === 'wicket';

    if (isFour) {
      sounds.playFourBoundary();
    } else if (isSix) {
      sounds.playSixBoundary();
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF6D00', '#FFAB00', '#FFD700', '#2962FF']
        });
      } catch (e) {}
    } else if (isWicket) {
      sounds.playWicket();
    }

    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, [celebration, onFinish]);

  if (!celebration) return null;

  const isFour = celebration.type === 'FOUR' || (celebration.type as string) === 'boundary_4';
  const isSix = celebration.type === 'SIX' || (celebration.type as string) === 'six_6';
  const isWicket = celebration.type === 'WICKET' || (celebration.type as string) === 'wicket';

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 1. FOUR (4) Celebration */}
      {isFour && (
        <div className="flex flex-col items-center justify-center space-y-2 animate-scale-up">
          <div className="w-32 h-32 rounded-full border-4 border-emerald-400 glow-green flex items-center justify-center bg-emerald-950/40 backdrop-blur-md shadow-[0_0_50px_rgba(0,230,118,0.6)]">
            <span className="text-6xl font-black font-['Poppins'] text-emerald-400 animate-bounce">4</span>
          </div>
          <div className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full text-white font-black text-xl uppercase tracking-widest shadow-2xl border-2 border-white/20">
            BOUNDING FOUR!
          </div>
        </div>
      )}

      {/* 2. SIX (6) Celebration */}
      {isSix && (
        <div className="flex flex-col items-center justify-center space-y-2 animate-scale-up">
          <div className="w-36 h-36 rounded-full border-4 border-amber-400 glow-gold flex items-center justify-center bg-amber-950/50 backdrop-blur-md shadow-[0_0_60px_rgba(255,109,0,0.8)]">
            <span className="text-7xl font-black font-['Poppins'] text-amber-400 animate-pulse">6</span>
          </div>
          <div className="px-8 py-2.5 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 rounded-full text-gray-900 font-black text-2xl uppercase tracking-widest shadow-2xl border-2 border-white/40">
            MONSTER SIX! 🔥
          </div>
        </div>
      )}

      {/* 3. WICKET Celebration */}
      {isWicket && (
        <div className="flex flex-col items-center justify-center space-y-2 animate-scale-up flash-wicket">
          <div className="w-36 h-36 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-950/60 backdrop-blur-md shadow-[0_0_60px_rgba(255,23,68,0.8)]">
            <div className="text-center">
              <span className="text-5xl font-black font-['Poppins'] text-red-500 block">W</span>
              <span className="text-[10px] font-extrabold text-red-300 uppercase tracking-widest block">OUT</span>
            </div>
          </div>
          <div className="px-8 py-2.5 bg-gradient-to-r from-red-700 to-rose-600 rounded-full text-white font-black text-2xl uppercase tracking-widest shadow-2xl border-2 border-white/30">
            WICKET FALLEN! 🏏
          </div>
        </div>
      )}
    </div>
  );
};
