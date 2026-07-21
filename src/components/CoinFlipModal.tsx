import React, { useState } from 'react';

interface Props {
  teamA: string;
  teamB: string;
  onSelectWinner: (team: 'Team A' | 'Team B') => void;
}

export const CoinFlipModal: React.FC<Props> = ({ teamA, teamB, onSelectWinner }) => {
  const [flipping, setFlipping] = useState<boolean>(false);
  const [result, setResult] = useState<'Team A' | 'Team B' | null>(null);

  const flipCoin = () => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);

    // Random outcome
    const winner: 'Team A' | 'Team B' = Math.random() > 0.5 ? 'Team A' : 'Team B';

    setTimeout(() => {
      setFlipping(false);
      setResult(winner);
    }, 1200);
  };

  return (
    <div className="p-4 bg-[#0F1729] border border-blue-500/40 rounded-[24px] space-y-4 text-center shadow-2xl relative overflow-hidden">
      <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
        🪙 Interactive 3D Toss Coin Flip
      </h4>

      <div className="flex justify-center items-center py-4">
        <div
          onClick={flipCoin}
          className={`w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-4 border-amber-200 flex items-center justify-center text-gray-900 font-black text-2xl cursor-pointer shadow-[0_0_30px_rgba(255,179,0,0.5)] transition-transform ${
            flipping ? 'animate-[spin_0.3s_linear_infinite]' : 'hover:scale-105 btn-material'
          }`}
        >
          {result ? (result === 'Team A' ? 'A' : 'B') : '🪙'}
        </div>
      </div>

      <p className="text-xs text-gray-400 font-medium">
        {flipping ? 'Flipping coin in air...' : result ? `Winner: ${result === 'Team A' ? teamA : teamB}!` : 'Tap coin to flip 3D toss!'}
      </p>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSelectWinner('Team A')}
          className={`py-3 px-3 rounded-2xl text-xs font-extrabold btn-material border transition ${
            result === 'Team A'
              ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
              : 'bg-[#08111F] border-gray-800 text-gray-300'
          }`}
        >
          {teamA}
        </button>
        <button
          type="button"
          onClick={() => onSelectWinner('Team B')}
          className={`py-3 px-3 rounded-2xl text-xs font-extrabold btn-material border transition ${
            result === 'Team B'
              ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
              : 'bg-[#08111F] border-gray-800 text-gray-300'
          }`}
        >
          {teamB}
        </button>
      </div>
    </div>
  );
};
