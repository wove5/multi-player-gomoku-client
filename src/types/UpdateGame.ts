import { POSITION_STATUS, ACTION } from '../constants';

export interface UpdateGame {
  id: string;
}

export interface ResetGame {
  status: POSITION_STATUS.NONE;
}

export interface EnterLeaveGame {
  action: ACTION;
}
