import { GAMESTATUS, POSITION_STATUS } from '../constants';
import { Message } from './Message';
import { PlayerDetail } from './PlayerDetail';

export interface GameInfo {
  _id: string;
  gameNumber: number;
  isMulti: boolean;
  size: number[];
  status: GAMESTATUS;
  positions: {
    status: POSITION_STATUS;
    _id: string;
  }[];
  selectedPositions: number[];
  createdAt: Date;
  updatedAt: Date;
  players: Array<PlayerDetail>;
  messages: Array<Message>;
}
