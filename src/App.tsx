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

type ScreenType = 'splash' | 'home' | 'create_match' | 'join_match' | 'live_umpire' | 'live_spectator' | 'match_finished' | 'match_history';

export function App() {
  const [screen, setScreen] = useState<ScreenType>('splash');
  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Sync browser history back actions with app screen navigation states
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setScreen(event.state.screen);
      } else {
        setScreen('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const navigate = (newScreen: ScreenType) => {
    setScreen(newScreen);
    window.history.pushState({ screen: newScreen }, '', `#${newScreen}`);
  };

  const handleSplashComplete = () => {
    setScreen('home');
    window.history.replaceState({ screen: 'home' }, '', '');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.screen !== 'home') {
      window.history.back();
    } else {
      navigate('home');
    }
  };

  return (
    <MobileContainer>
      {screen === 'splash' && (
        <Splash onComplete={handleSplashComplete} />
      )}

      {screen === 'home' && (
        <HomeScreen
          activeMatch={activeMatch}
          onCreateMatch={() => navigate('create_match')}
          onJoinMatch={() => navigate('join_match')}
          onResumeMatch={() => navigate('live_umpire')}
          onViewHistory={() => navigate('match_history')}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === 'create_match' && (
        <CreateMatchScreen
          onBack={handleBack}
          onMatchCreated={(m) => {
            setActiveMatch(m);
            navigate('live_umpire');
          }}
        />
      )}

      {screen === 'join_match' && (
        <JoinMatchScreen
          onBack={handleBack}
          onJoinedMatch={(m) => {
            setActiveMatch(m);
            navigate('live_spectator');
          }}
        />
      )}

      {screen === 'live_umpire' && activeMatch && (
        <LiveScoringUmpire
          match={activeMatch}
          onBack={handleBack}
          onMatchFinished={(m) => {
            setActiveMatch(m);
            navigate('match_finished');
          }}
        />
      )}

      {screen === 'live_spectator' && activeMatch && (
        <SpectatorScreen
          initialMatch={activeMatch}
          onBack={handleBack}
          onMatchFinished={(m) => {
            setActiveMatch(m);
            navigate('match_finished');
          }}
        />
      )}

      {screen === 'match_finished' && activeMatch && (
        <MatchFinishedScreen
          match={activeMatch}
          onDone={() => {
            setActiveMatch(null);
            navigate('home');
          }}
        />
      )}

      {screen === 'match_history' && (
        <MatchHistoryScreen
          onBack={handleBack}
          onOpenMatch={(m) => {
            setActiveMatch(m);
            if (m.status === 'finished') {
              navigate('match_finished');
            } else {
              navigate('live_spectator');
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
