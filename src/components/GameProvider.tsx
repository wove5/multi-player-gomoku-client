import { useContext, useEffect, useState } from 'react';
import { GameContext, UserContext } from '../context';
import { useLocation } from 'react-router-dom';
import { EnterLeaveGame, PlayerDetail } from '../types';
import { RestFromGameReply } from '../interfaces';
import { ACTION, API_HOST } from '../constants';
import { put } from '../utils/http';
import { CustomWebSocket } from '../classes';

interface GameProviderProps {
  children: React.ReactNode;
}

export default function GameProvider({ children }: GameProviderProps) {
  const location = useLocation();
  let currentPath = location.pathname;
  const state = location.state;
  const { user } = useContext(UserContext);

  const players: Array<PlayerDetail> | undefined =
    state && (state.playersUpdated || state.players);

  const me: PlayerDetail =
    state && (state.playersUpdated || state.players)
      ? (state.playersUpdated || state.players).find(
          (p: PlayerDetail) => p.userId === user?._id
        )
      : undefined;

  const otherPlayer: PlayerDetail =
    state && (state.playersUpdated || state.players)
      ? (state.playersUpdated || state.players).find(
          (p: PlayerDetail) => p.userId !== user?._id
        )
      : undefined;

  // extract "currentPath" from localStorage
  const getCurrentPath = (): string => {
    const item = localStorage.getItem('currentPath');
    return item ? JSON.parse(item) : '';
  };

  console.log(`state?.gameId = ${state?.gameId}`);
  console.log('GameProvider setting initial value of gameId ');
  const [gameId, setGameId] = useState<string | undefined>(state?.gameId);
  console.log(`gameId = ${gameId}`);

  let previousPath = getCurrentPath() === '' ? currentPath : getCurrentPath();

  const [ws, setWs] = useState<CustomWebSocket | undefined>(undefined);
  const [windowIsActive, setWindowIsActive] = useState<boolean | undefined>(
    true
  );

  const [headerHeight, setHeaderHeight] = useState<number | undefined>();

  const restFromGame = async (gameId: string) => {
    try {
      console.log(`Sending put request to Rest from game`);
      await put<EnterLeaveGame, RestFromGameReply>(
        `${API_HOST}/api/game/${gameId}`,
        {
          action: ACTION.REST,
        }
      );
    } catch (error) {
      console.log('something went wrong with taking Rest');
    }
  };

  useEffect(() => {
    localStorage.setItem('currentPath', JSON.stringify(currentPath));

    function handleActivity(forcedFlag: boolean | undefined) {
      if (typeof forcedFlag === 'boolean') {
        console.log(`${forcedFlag ? 'focus event' : 'blur event'}`);
        console.log(`setting windowIsActive to: ${forcedFlag}`);
        forcedFlag ? setWindowIsActive(true) : setWindowIsActive(false);
      } else {
        console.log('visibilitychange event');
        console.log(`document.hidden = ${document.hidden}`);
        console.log(`setting windowIsActive to: ${!document.hidden}`);
        document.hidden ? setWindowIsActive(false) : setWindowIsActive(true);
      }
      console.log(`windowIsActive = ${windowIsActive}`);
    }

    const handleActivityFalse = () => handleActivity(false);
    const handleActivityTrue = () => handleActivity(true);

    setGameId(state?.gameId);
    // This solution works because state is cleared whether directly or programmatically navigating away from Game page.
    if (
      state?.players === undefined &&
      state?.playersUpdated === undefined &&
      windowIsActive
    ) {
      // this branch of the condition is akin to a cleanup but in a retrospective manner
      const userItem = localStorage.getItem('user');

      // state?gameId update is delayed and not captured in time to trigger the restFromGame branch - therefore using gameId state
      if (userItem && gameId) {
        // the token needs to be in place to successfully make rest from game api req.
        restFromGame(gameId).then(() => {
          ws?.close();
        });
      } else {
        // the Logout btn in Header will have called restFromGame(), so token will be gone.
        ws?.close();
      }
      console.log('GameProvider useEffect setup: removing event listeners');
      document.removeEventListener('visibilitychange', () => handleActivity);
      window.removeEventListener('blur', handleActivityFalse);
      document.removeEventListener('blur', handleActivityFalse);
      window.removeEventListener('focus', handleActivityTrue);
      document.removeEventListener('focus', handleActivityTrue);
    } else {
      // in the case of mobile phone going to sleep and losing connection,
      // i.e. client drops connection; reload the page on focus of browser tab
      if (state?.playersUpdated && ws?.readyState && ws.readyState > 1) {
        console.log(`reloading page`);
        window.location.reload();
      }
      console.log('GameProvider useEffect setup: adding event listeners');
      document.addEventListener('visibilitychange', () => handleActivity);
      document.addEventListener('blur', handleActivityFalse);
      window.addEventListener('blur', handleActivityFalse);
      window.addEventListener('focus', handleActivityTrue);
      document.addEventListener('focus', handleActivityTrue);
    }

    return () => {
      console.log(
        `GameProvider component cleanup: state.players = ${state?.players}`
      );
      console.log(
        `GameProvider component cleanup: state.playersUpdated = ${state?.playersUpdated}`
      );
      console.log('GameProvider useEffect cleanup: removing event listeners');
      document.removeEventListener('visibilitychange', () => handleActivity);
      window.removeEventListener('blur', handleActivityFalse);
      document.removeEventListener('blur', handleActivityFalse);
      window.removeEventListener('focus', handleActivityTrue);
      document.removeEventListener('focus', handleActivityTrue);
    };
  }, [
    currentPath,
    previousPath,
    ws,
    // optional chaining guards against null state as done in Game component
    state?.players,
    state?.playersUpdated,
    state?.gameId,
    gameId,
    windowIsActive,
  ]);

  return (
    <GameContext.Provider
      value={{
        currentPath,
        previousPath,
        restFromGame,
        players,
        me,
        otherPlayer,
        setWs,
        headerHeight,
        setHeaderHeight,
        windowIsActive,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
