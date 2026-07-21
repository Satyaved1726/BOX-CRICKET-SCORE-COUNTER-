import React, { useState } from 'react';
import { X, Volume2, VolumeX, Smartphone, Trash2, Check } from 'lucide-react';
import { sounds } from '../lib/audio';

interface Props {
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sounds.isEnabled());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [cleared, setCleared] = useState<boolean>(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  };

  const toggleHaptics = () => {
    setHapticsEnabled(!hapticsEnabled);
  };

  const handleClearCache = () => {
    sounds.playTap();
    localStorage.clear();
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-scale-up select-none">
      <div className="w-full max-w-sm bg-[#111827] border border-white/10 rounded-[28px] p-5 space-y-4 shadow-2xl glass">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-extrabold text-white">App Settings</h3>
          <button
            onClick={() => { sounds.playTap(); onClose(); }}
            className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-full transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Exactly 3 options: Sound, Haptics, Clear Cache */}
        <div className="space-y-2 py-1">
          {/* 1. Sound Effects Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sound Effects</h4>
                <p className="text-[10px] text-gray-400">Bat, boundary &amp; wicket sounds</p>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                soundEnabled ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  soundEnabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* 2. Haptics Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Haptic Feedback</h4>
                <p className="text-[10px] text-gray-400">Vibration on scoring taps</p>
              </div>
            </div>
            <button
              onClick={toggleHaptics}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                hapticsEnabled ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  hapticsEnabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* 3. Clear Local Cache */}
          <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Clear Local Cache</h4>
                <p className="text-[10px] text-gray-400">Purge offline match data</p>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold rounded-xl hover:bg-red-600 hover:text-white btn-material transition shrink-0"
            >
              {cleared ? 'Cleared!' : 'Clear'}
            </button>
          </div>
        </div>

        {/* Footer Done Button */}
        <button
          onClick={() => { sounds.playTap(); onClose(); }}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow btn-material shrink-0"
        >
          <Check size={16} /> Done
        </button>
      </div>
    </div>
  );
};
