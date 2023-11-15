import { useEffect } from 'react';
import { GameContext } from '../context';
import { useLocation } from 'react-router-dom';
import { EnterLeaveGame } from '../types';
import { RestFromGameReply } from '../interfaces';
import { ACTION, API_HOST } from '../constants';
import { put } from '../utils/http';

interface GameProviderProps {
  children: React.ReactNode;
}

export default function GameProvider({ children }: GameProviderProps) {
  const location = useLocation();
  let currentPath = location.pathname;

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
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
