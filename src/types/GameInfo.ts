import { GAMESTATUS, POSITION_STATUS } from '../constants';
import { PlayerDetail } from './PlayerDetail';
import { UserDetail } from './UserDetail';

export interface GameInfo {
  _id: string;
  userId: string;
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
  userDetail: Array<UserDetail>;
}
