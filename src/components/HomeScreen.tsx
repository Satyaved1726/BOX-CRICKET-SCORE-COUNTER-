import React, { useState } from 'react';
import { PlusCircle, Eye, History, Settings, Play } from 'lucide-react';
import type { MatchData } from '../types';
import { sounds } from '../lib/audio';
import { TeamCarousel } from './TeamCarousel';
import { SettingsModal } from './SettingsModal';

interface Props {
  activeMatch: MatchData | null;
  onCreateMatch: () => void;
  onJoinMatch: () => void;
  onResumeMatch: () => void;
  onViewHistory: () => void;
  onOpenSettings?: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  activeMatch,
  onCreateMatch,
  onJoinMatch,
  onResumeMatch,
  onViewHistory,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col justify-between p-4 bg-[#05070D] text-white select-none overflow-y-auto font-['Inter'] relative">
      {/* 1. Header (home-header) */}
      <div className="home-header">
        <div className="trophy-badge overflow-hidden">
          <img src="/logo.jpg" alt="BSC Logo" className="w-full h-full object-cover" />
        </div>
        <div className="header-text">
          <div className="welcome-label">Welcome umpire</div>
          <div className="app-title">BSC Score Counter</div>
        </div>
        <button
          onClick={() => { sounds.playTap(); setShowSettingsModal(true); }}
          className="settings-icon p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition btn-material"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col space-y-4 my-1">
        {/* 2. Resume Card (resume-card) with Team Carousel */}
        {activeMatch && activeMatch.status === 'live' ? (
          <div className="resume-card glass">
            <div className="resume-top">
              <div className="live-badge">
                <span className="live-dot"></span>
                <span className="live-text">LIVE NOW</span>
              </div>
              <div className="room-code-tag">
                Code&nbsp;<b>{activeMatch.roomCode}</b>
              </div>
            </div>

            <div className="match-title">
              {activeMatch.tournamentName ? `${activeMatch.tournamentName} · ` : ''}{activeMatch.matchName}
            </div>

            {/* Horizontal Swipeable Team Carousel */}
            <TeamCarousel
              teamA={{
                name: activeMatch.teamA,
                sub: `Batting · ${activeMatch.currentInnings === 1 ? `${activeMatch.scoreA}/${activeMatch.wicketsA}` : 'Target ' + (activeMatch.targetRuns || 0)}`,
                bgGradient: 'linear-gradient(135deg, #2962FF, #00C6FF)'
              }}
              teamB={{
                name: activeMatch.teamB,
                sub: `${activeMatch.currentInnings === 2 ? `Batting · ${activeMatch.scoreB}/${activeMatch.wicketsB}` : 'Bowling'}`,
                bgGradient: 'linear-gradient(135deg, #9333EA, #C084FC)'
              }}
            />

            <div className="score-line">
              <div className="score-big">
                {activeMatch.currentInnings === 2 ? activeMatch.scoreB : activeMatch.scoreA}
                <span>/{activeMatch.currentInnings === 2 ? activeMatch.wicketsB : activeMatch.wicketsA}</span>
              </div>
              <div className="overs-tag">
                <div className="lbl">OVERS</div>
                <div className="val">
                  {activeMatch.currentInnings === 2 ? activeMatch.oversB : activeMatch.oversA} / {activeMatch.totalOvers}
                </div>
              </div>
            </div>

            <button onClick={onResumeMatch} className="resume-btn btn-material">
              <Play size={16} fill="currentColor" /> Resume live match
            </button>
          </div>
        ) : null}

        {/* 3. Grid 2x2 Action Cards */}
        <div className="grid2x2">
          {/* Create Match */}
          <div onClick={onCreateMatch} className="action-card glass cursor-pointer btn-material">
            <div className="action-icon blue">
              <PlusCircle size={20} />
            </div>
            <div>
              <div className="action-eyebrow blue">Umpire</div>
              <div className="action-title">Create match</div>
              <div className="action-sub">Start live match</div>
            </div>
          </div>

          {/* Join Match */}
          <div onClick={onJoinMatch} className="action-card glass cursor-pointer btn-material">
            <div className="action-icon green">
              <Eye size={20} />
            </div>
            <div>
              <div className="action-eyebrow green">Spectator</div>
              <div className="action-title">Join match</div>
              <div className="action-sub">Room code watch</div>
            </div>
          </div>

          {/* Match History */}
          <div onClick={onViewHistory} className="action-card glass cursor-pointer btn-material">
            <div className="action-icon purple">
              <History size={20} />
            </div>
            <div>
              <div className="action-eyebrow purple">Archives</div>
              <div className="action-title">Match history</div>
              <div className="action-sub">Past scorecards</div>
            </div>
          </div>

          {/* Settings */}
          <div onClick={() => setShowSettingsModal(true)} className="action-card glass cursor-pointer btn-material">
            <div className="action-icon gray">
              <Settings size={20} />
            </div>
            <div>
              <div className="action-eyebrow gray">System</div>
              <div className="action-title">App settings</div>
              <div className="action-sub">Audio &amp; storage</div>
            </div>
          </div>
        </div>

        {/* 4. Recent Activity Card */}
        <div className="recent-card glass">
          <div className="recent-head">
            <div className="recent-head-l font-bold">Recent activity</div>
            <div onClick={onViewHistory} className="recent-head-r cursor-pointer hover:underline">
              View all ›
            </div>
          </div>
          <div className="recent-row">
            <div>
              <div className="recent-teams">Thunder Strikers vs Royal Challengers</div>
              <div className="recent-result">Thunder Strikers won by 18 runs</div>
            </div>
            <div className="recent-score">78/4 vs 60/6</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
};
