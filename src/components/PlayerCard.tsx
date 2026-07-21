import React from 'react';
import { User, Edit2 } from 'lucide-react';

interface BatsmanCardProps {
  name: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
  isStriker?: boolean;
  onEdit?: () => void;
}

export const BatsmanPlayerCard: React.FC<BatsmanCardProps> = ({
  name,
  runs,
  balls,
  fours = 0,
  sixes = 0,
  isStriker = false,
  onEdit,
}) => {
  const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(0) : '0';

  return (
    <div
      className={`p-4 rounded-[20px] border transition-all ${
        isStriker
          ? 'bg-gradient-to-r from-blue-950/60 via-[#111827] to-[#111827] border-blue-500/60 shadow-[0_4px_20px_rgba(41,98,255,0.2)]'
          : 'bg-[#08111F] border-gray-800/80'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Avatar & Name */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow ${
              isStriker
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white ring-2 ring-blue-400/60'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              {isStriker && <span className="text-amber-400 text-sm font-bold">★</span>}
              <span
                onClick={onEdit}
                className={`text-base font-extrabold ${
                  isStriker ? 'text-white' : 'text-gray-200'
                } ${onEdit ? 'cursor-pointer hover:text-blue-400' : ''} flex items-center gap-1.5`}
              >
                {name} {onEdit && <Edit2 size={12} className="text-gray-500" />}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              SR <strong className="text-gray-200">{strikeRate}</strong>
            </p>
          </div>
        </div>

        {/* Right: Score (Runs/Balls) & Boundaries */}
        <div className="text-right">
          <div className="text-xl font-black font-mono text-emerald-400">
            {runs} <span className="text-sm text-gray-400 font-normal">({balls})</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300 justify-end mt-0.5">
            <span>4s: <strong className="text-white font-bold">{fours}</strong></span>
            <span className="text-gray-600">•</span>
            <span>6s: <strong className="text-white font-bold">{sixes}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BowlerCardProps {
  name: string;
  overs: number;
  runs: number;
  wickets: number;
  legalBalls?: number;
  wides?: number;
  noBalls?: number;
  onEdit?: () => void;
}

export const BowlerPlayerCard: React.FC<BowlerCardProps> = ({
  name,
  overs,
  runs,
  wickets,
  legalBalls = 0,
  wides = 0,
  noBalls = 0,
  onEdit,
}) => {
  const calcOvers = overs > 0 ? overs : legalBalls / 6;
  const economy = calcOvers > 0 ? (runs / calcOvers).toFixed(2) : '0.00';

  return (
    <div className="p-4 bg-[#08111F] border border-gray-800 rounded-[20px] shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center justify-center font-black text-base shrink-0 shadow">
            <User size={20} />
          </div>

          <div>
            <span
              onClick={onEdit}
              className={`text-base font-extrabold text-white ${
                onEdit ? 'cursor-pointer hover:text-blue-400' : ''
              } flex items-center gap-1.5`}
            >
              {name} {onEdit && <Edit2 size={12} className="text-gray-500" />}
            </span>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Econ <strong className="text-purple-300">{economy}</strong>
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-lg font-black text-white">
            {wickets} <span className="text-xs text-red-400 uppercase">Wkts</span>
          </div>
          <p className="text-xs text-gray-400 font-bold">{runs} Runs Conceded</p>
        </div>
      </div>

      {/* Stats Breakdown Bar */}
      <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-300 font-mono">
        <div>
          Overs: <strong className="text-white">{overs}</strong>
        </div>
        <div>
          Wides: <strong className="text-amber-400">{wides}</strong>
        </div>
        <div>
          No Balls: <strong className="text-orange-400">{noBalls}</strong>
        </div>
      </div>
    </div>
  );
};
