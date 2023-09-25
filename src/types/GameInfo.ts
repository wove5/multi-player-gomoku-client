import { GAMESTATUS, POSITION_STATUS } from '../constants';

export interface GameInfo {
  _id: string;
  userId: string;
  gameNumber: number;
  size: number[];
  status: GAMESTATUS;
  positions: {
    status: POSITION_STATUS;
    _id: string;
  }[];
  selectedPositions: number[];
  createdAt: Date;
  updatedAt: Date;
}
