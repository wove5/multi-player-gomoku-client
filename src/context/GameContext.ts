import { createContext } from 'react';
import { GameContextInterface } from '../interfaces';

const GameContext = createContext<GameContextInterface>(
  {} as GameContextInterface
);
export default GameContext;
