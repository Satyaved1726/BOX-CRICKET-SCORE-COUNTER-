import React, { useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

export const Splash: React.FC<Props> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black text-white p-0 relative overflow-hidden select-none w-full min-h-screen">
      {/* Full-Screen Center Brand Logo */}
      <div className="z-10 flex items-center justify-center w-full max-w-xs px-4">
        <img
          src="/logo.jpg"
          alt="BSC Logo"
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
};
