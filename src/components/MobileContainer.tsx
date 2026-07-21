import React from 'react';

interface Props {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<Props> = ({ children }) => {
  return (
    <div className="relative w-full min-h-screen bg-[#05070D] text-white flex flex-col overflow-hidden">
      {/* Ambient Mesh Background Layer */}
      <div className="mesh">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* App Main Body Content */}
      <div className="flex-1 flex flex-col relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};
