import { GAMESTATUS, POSITION_STATUS } from '../constants';

export interface GameStatus {
  status: GAMESTATUS;
  player: POSITION_STATUS;
}
