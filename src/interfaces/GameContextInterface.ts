import { CustomWebSocket } from '../classes';
import { PlayerDetail } from '../types';

export interface GameContextInterface {
  currentPath: string;
  previousPath: string;
  restFromGame: (gameId: string) => Promise<void>;
  players: PlayerDetail[] | undefined;
  me: PlayerDetail;
  otherPlayer?: PlayerDetail;
  setWs: (arg: CustomWebSocket) => void;
  headerHeight: number | undefined;
  setHeaderHeight: (arg: number | undefined) => void;
  windowIsActive: boolean | undefined;
}
