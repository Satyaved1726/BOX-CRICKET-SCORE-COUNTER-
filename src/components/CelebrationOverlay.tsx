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

    let duration = 1000; // default 1 sec

    if (isFour) {
      sounds.playFourBoundary();
      duration = 1000; // 1 sec
    } else if (isSix) {
      sounds.playSixBoundary();
      duration = 1500; // 1.5 sec
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.65 },
          colors: ['#7C3AED', '#A78BFA', '#2563EB', '#3B82F6', '#FFFFFF']
        });
      } catch (e) {}
    } else if (isWicket) {
      sounds.playWicket();
      duration = 1000; // 1 sec
    }

    const timer = setTimeout(() => {
      onFinish();
    }, duration);

    return () => clearTimeout(timer);
  }, [celebration, onFinish]);

  if (!celebration) return null;

  const isFour = celebration.type === 'FOUR' || (celebration.type as string) === 'boundary_4';
  const isSix = celebration.type === 'SIX' || (celebration.type as string) === 'six_6';
  const isWicket = celebration.type === 'WICKET' || (celebration.type as string) === 'wicket';

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 1. FOUR (4) Celebration - Blue Wave / Boundary Glow */}
      {isFour && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-950/20 backdrop-blur-[2px] animate-fade-in">
          {/* Ripple Ring Effect */}
          <div className="absolute w-72 h-72 rounded-full border border-blue-500/30 animate-ping opacity-60"></div>
          <div className="flex flex-col items-center space-y-2 z-10 animate-scale-up">
            <div className="w-28 h-28 rounded-full border-4 border-blue-400 bg-blue-950/80 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.7)]">
              <span className="text-6xl font-black font-['Poppins'] text-blue-400">4</span>
            </div>
            <div className="px-6 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-white font-black text-lg uppercase tracking-widest shadow-lg border border-white/10">
              FOUR!
            </div>
          </div>
        </div>
      )}

      {/* 2. SIX (6) Celebration - Confetti, Screen Pulse, Purple theme */}
      {isSix && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/30 backdrop-blur-[3px] animate-pulse">
          <div className="flex flex-col items-center space-y-2 z-10 animate-scale-up">
            <div className="w-32 h-32 rounded-full border-4 border-purple-400 bg-purple-950/80 flex items-center justify-center shadow-[0_0_55px_rgba(124,58,237,0.8)]">
              <span className="text-7xl font-black font-['Poppins'] text-purple-300">6</span>
            </div>
            <div className="px-8 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-500 rounded-full text-white font-black text-xl uppercase tracking-widest shadow-2xl border border-white/20">
              SIX!!
            </div>
          </div>
        </div>
      )}

      {/* 3. WICKET Celebration - Full screen red flash, stump effect */}
      {isWicket && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/45 backdrop-blur-[2px] animate-fade-in">
          {/* Strobe screen boundary */}
          <div className="absolute inset-0 border-[8px] border-red-600/50 animate-pulse"></div>
          <div className="flex flex-col items-center space-y-2 z-10 animate-scale-up">
            <div className="w-28 h-28 rounded-full border-4 border-red-500 bg-red-950/90 flex items-center justify-center shadow-[0_0_45px_rgba(220,38,38,0.8)]">
              <div className="text-center">
                <span className="text-5xl font-black font-['Poppins'] text-red-500 block">W</span>
                <span className="text-[10px] font-extrabold text-red-300 tracking-wider block">OUT</span>
              </div>
            </div>
            <div className="px-6 py-1.5 bg-gradient-to-r from-red-700 to-rose-600 rounded-full text-white font-black text-lg uppercase tracking-widest shadow-lg border border-white/10">
              WICKET FALLEN!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
