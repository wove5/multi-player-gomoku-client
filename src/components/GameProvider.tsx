import { useEffect } from 'react';
import { GameContext } from '../context';
import { useLocation } from 'react-router-dom';

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
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
