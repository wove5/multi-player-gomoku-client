import { useContext, useEffect } from 'react';
import { GameContext, UserContext } from '../context';
import { useLocation } from 'react-router-dom';
import { EnterLeaveGame, PlayerDetail } from '../types';
import { RestFromGameReply } from '../interfaces';
import { ACTION, API_HOST } from '../constants';
import { put } from '../utils/http';

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

  let previousPath = getCurrentPath() === '' ? currentPath : getCurrentPath();

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
    // console.log(`currentPath = ${currentPath}`);
    // console.log(`previousPath = ${previousPath}`);
  }, [currentPath, previousPath]);

  return (
    <GameContext.Provider
      value={{
        currentPath,
        previousPath,
        restFromGame,
        players,
        me,
        otherPlayer,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
