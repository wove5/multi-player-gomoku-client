import { PlayerDetail } from '../types';

export interface GameContextInterface {
  currentPath: string;
  previousPath: string;
  restFromGame: (gameId: string) => Promise<void>;
  players: PlayerDetail[] | undefined;
  me: PlayerDetail;
  otherPlayer?: PlayerDetail;
}
