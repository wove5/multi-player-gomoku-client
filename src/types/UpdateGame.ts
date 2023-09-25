import { POSITION_STATUS } from '../constants';

export interface UpdateGame {
  id: string;
}

export interface ResetGame {
  status: POSITION_STATUS.NONE;
}
