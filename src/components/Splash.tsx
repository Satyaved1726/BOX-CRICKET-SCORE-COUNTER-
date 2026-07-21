import React, { useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

export const Splash: React.FC<Props> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#05070D] text-white p-6 relative overflow-hidden select-none">
      {/* Dynamic background glowing sports circles */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Full-Screen Centered Logo */}
      <div className="z-10 flex items-center justify-center w-full max-w-xs px-4 animate-scale-up">
        <img
          src="/logo.jpg"
          alt="BSC Logo"
          className="w-full h-auto rounded-[32px] shadow-[0_15px_50px_rgba(41,98,255,0.25)] border border-white/10"
        />
      </div>

      {/* Footer loading indicator */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-gray-400 text-xs">
        <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
};
