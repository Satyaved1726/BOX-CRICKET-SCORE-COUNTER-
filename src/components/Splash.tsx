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

      {/* Animated Logo Container */}
      <div className="flex flex-col items-center z-10 animate-scale-up">
        <div className="relative mb-6">
          {/* Outer glowing ring with Logo */}
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-blue-500/40 flex items-center justify-center bg-[#111827] shadow-[0_0_40px_rgba(41,98,255,0.3)]">
            <img src="/logo.jpg" alt="BSC Logo" className="w-full h-full object-cover" />
          </div>

          {/* Cricket ball spinning around logo */}
          <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
            <div className="w-5 h-5 bg-red-600 rounded-full border border-white/80 shadow-md transform translate-x-14 flex items-center justify-center">
              <div className="w-full h-0.5 bg-white/60"></div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent mb-1 font-['Poppins']">
          BSC
        </h1>
        <p className="text-xs tracking-widest text-blue-400 font-semibold uppercase mb-6">
          Box Cricket Score Counter
        </p>
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
