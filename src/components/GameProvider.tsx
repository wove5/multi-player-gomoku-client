import { useContext, useEffect, useState } from 'react';
import { GameContext, UserContext } from '../context';
import { useLocation } from 'react-router-dom';
import { EnterLeaveGame, PlayerDetail } from '../types';
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

  // possibly should incl. type | undefined - but seems to work fine as is
  const me: PlayerDetail =
    state && (state.playersUpdated || state.players)
      ? (state.playersUpdated || state.players).find(
          (p: PlayerDetail) => p.user._id === user?._id
        )
      : undefined;

  const otherPlayer: PlayerDetail =
    state && (state.playersUpdated || state.players)
      ? (state.playersUpdated || state.players).find(
          (p: PlayerDetail) => p.user._id !== user?._id
        )
      : undefined;

  // extract "currentPath" from localStorage
  const getCurrentPath = (): string => {
    const item = localStorage.getItem('currentPath');
    return item ? JSON.parse(item) : '';
  };

  console.log(`\nGameProvider; state?.gameId = ${state?.gameId}`);

  let previousPath = getCurrentPath() === '' ? currentPath : getCurrentPath();

  const [ws, setWs] = useState<CustomWebSocket | undefined>(undefined);
  const [windowIsActive, setWindowIsActive] = useState<boolean | undefined>(
    true
  );

  const [headerHeight, setHeaderHeight] = useState<number | undefined>();

  const restFromGame = async (gameId: string) => {
    try {
      console.log(`Sending put request to Rest from game`);
      // await put<EnterLeaveGame, RestFromGameReply>( // unecessary to be receiving data in payload
      await put<EnterLeaveGame, {}>(
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
    }

    const handleActivityFalse = () => handleActivity(false);
    const handleActivityTrue = () => handleActivity(true);

    console.log(
      `GameProvider useEffect setup; state?.gameId = ${state?.gameId}`
    );
    // state is cleared whether directly or programmatically navigating away from Game page.
    if (
      state?.players === undefined &&
      state?.playersUpdated === undefined &&
      // state?.gameId === undefined && // incl. here or deeper down as is?
      windowIsActive &&
      currentPath !== previousPath
    ) {
      // this branch of the condition is akin to a cleanup but in a retrospective manner
      const userItem = localStorage.getItem('user');

      // Two renders occur loading game page - state?.gameId is undefined in 1st render but defined in 2nd.
      if (ws && ws.readyState === 1) {
        // after navigating away from a game, state.gameId is gone, so reconstruct theGameId for a one-off use 
        const theGameId = previousPath.includes('/') ? previousPath.split('/').at(-1) : '';
        // token and gameId is needed to successfully make rest from game api req.
        if (userItem && !state?.gameId && theGameId && theGameId.length > 0) { // !state?.gameId may not be needed?
          // TODO: maybe fix redundant restFromGame call on LEAVE game? "Resting" ws msg not sent by server anyway
          restFromGame(theGameId).then(() => {
            ws.close();
          });
        } else {
          // the Logout btn in Header will have called restFromGame(), so token will be gone.
          ws.close();
        }
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
        `GameProvider useEffect cleanup: state.players = ${state?.players}`
      );
      console.log(
        `GameProvider useEffect cleanup: state.playersUpdated = ${state?.playersUpdated}`
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
    state?.players,
    state?.playersUpdated,
    state?.gameId,
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
