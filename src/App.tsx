import { useState, useEffect } from 'react';
import { MobileContainer } from './components/MobileContainer';
import { Splash } from './components/Splash';
import { HomeScreen } from './components/HomeScreen';
import { CreateMatchScreen } from './components/CreateMatchScreen';
import { JoinMatchScreen } from './components/JoinMatchScreen';
import { LiveScoringUmpire } from './components/LiveScoringUmpire';
import { SpectatorScreen } from './components/SpectatorScreen';
import { MatchFinishedScreen } from './components/MatchFinishedScreen';
import { MatchHistoryScreen } from './components/MatchHistoryScreen';
import { SettingsModal } from './components/SettingsModal';
import type { MatchData } from './types';
import { getMatchState } from './lib/supabase';

export function App() {
  const [screen, setScreen] = useState<
    'splash' | 'home' | 'create_match' | 'join_match' | 'live_umpire' | 'live_spectator' | 'match_finished' | 'match_history'
  >('splash');

  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const currentCode = localStorage.getItem('bsc_current_match_code');
      if (currentCode) {
        getMatchState(currentCode).then((m) => {
          if (m && m.status === 'live') {
            setActiveMatch(m);
          }
        });
      }
    }
  }, []);

  return (
    <MobileContainer>
      {screen === 'splash' && (
        <Splash onComplete={() => setScreen('home')} />
      )}

      {screen === 'home' && (
        <HomeScreen
          activeMatch={activeMatch}
          onCreateMatch={() => setScreen('create_match')}
          onJoinMatch={() => setScreen('join_match')}
          onResumeMatch={() => setScreen('live_umpire')}
          onViewHistory={() => setScreen('match_history')}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === 'create_match' && (
        <CreateMatchScreen
          onBack={() => setScreen('home')}
          onMatchCreated={(m) => {
            setActiveMatch(m);
            setScreen('live_umpire');
          }}
        />
      )}

      {screen === 'join_match' && (
        <JoinMatchScreen
          onBack={() => setScreen('home')}
          onJoinedMatch={(m) => {
            setActiveMatch(m);
            setScreen('live_spectator');
          }}
        />
      )}

      {screen === 'live_umpire' && activeMatch && (
        <LiveScoringUmpire
          match={activeMatch}
          onBack={() => setScreen('home')}
          onMatchFinished={(m) => {
            setActiveMatch(m);
            setScreen('match_finished');
          }}
        />
      )}

      {screen === 'live_spectator' && activeMatch && (
        <SpectatorScreen
          initialMatch={activeMatch}
          onBack={() => setScreen('home')}
          onMatchFinished={(m) => {
            setActiveMatch(m);
            setScreen('match_finished');
          }}
        />
      )}

      {screen === 'match_finished' && activeMatch && (
        <MatchFinishedScreen
          match={activeMatch}
          onDone={() => {
            setActiveMatch(null);
            setScreen('home');
          }}
        />
      )}

      {screen === 'match_history' && (
        <MatchHistoryScreen
          onBack={() => setScreen('home')}
          onOpenMatch={(m) => {
            setActiveMatch(m);
            if (m.status === 'finished') {
              setScreen('match_finished');
            } else {
              setScreen('live_spectator');
            }
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </MobileContainer>
  );
}

export default App;
