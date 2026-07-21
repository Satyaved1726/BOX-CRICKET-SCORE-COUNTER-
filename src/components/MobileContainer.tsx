import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Smartphone, Monitor } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<Props> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [framed, setFramed] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#030712] p-0 sm:p-4 transition-all">
      {/* Desktop view frame switcher indicator */}
      <div className="hidden sm:flex items-center gap-2 mb-2 text-xs text-gray-400">
        <span className="font-semibold text-blue-400">BSC Native Android Container</span>
        <button
          onClick={() => setFramed(!framed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xs border border-gray-700 transition"
        >
          {framed ? <Smartphone size={14} /> : <Monitor size={14} />}
          {framed ? 'Phone Frame View' : 'Full Screen View'}
        </button>
      </div>

      {/* Main App Container */}
      <div
        className={`relative w-full overflow-hidden bg-[#08111F] text-white flex flex-col transition-all duration-300 ${
          framed
            ? 'max-w-[420px] h-[100vh] sm:h-[860px] sm:rounded-[44px] sm:border-[10px] sm:border-gray-800 sm:shadow-[0_25px_60px_rgba(0,0,0,0.9)]'
            : 'max-w-md min-h-screen rounded-none'
        }`}
      >
        {/* Android Camera Punch Hole */}
        {framed && (
          <div className="hidden sm:flex justify-center absolute top-2 left-0 right-0 z-50 pointer-events-none">
            <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 bg-gray-900 rounded-full border border-gray-700"></div>
            </div>
          </div>
        )}

        {/* Status Bar with Proper Inset Padding so content is never cut off */}
        <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-xs text-gray-300 z-40 bg-[#08111F] select-none shrink-0">
          <span className="font-semibold tracking-tight text-white">{currentTime || '12:00'}</span>
          <div className="flex items-center gap-2 text-gray-300">
            <Signal size={12} className="text-gray-200" />
            <Wifi size={12} className="text-gray-200" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-semibold">98%</span>
              <Battery size={14} className="text-emerald-400 fill-emerald-400/30" />
            </div>
          </div>
        </div>

        {/* Ambient Mesh Background Layer */}
        <div className="mesh">
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="blob b3" />
        </div>

        {/* App Main Body Content */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10">
          {children}
        </div>

        {/* Android Bottom Gesture Navigation Bar */}
        <div className="h-5 w-full bg-[#08111F] flex items-center justify-center pt-0.5 pb-1 z-40 shrink-0">
          <div className="w-28 h-1 bg-gray-600 rounded-full opacity-60"></div>
        </div>
      </div>
    </div>
  );
};
