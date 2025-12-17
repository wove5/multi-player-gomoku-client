import { POSITION_STATUS, ACTION } from '../constants';
import { Message } from './Message';

// export interface UpdateGame {
//   id: string
// }

interface UpdateGameWithId {
  id: string;
  msg?: never;
}

interface UpdateGameWithMsg {
  msg: Message;
  id?: never;
}

export type UpdateGame = UpdateGameWithId | UpdateGameWithMsg;

export interface ResetGame {
  status: POSITION_STATUS.NONE;
}

export interface EnterLeaveGame {
  action: ACTION;
}

export interface UpdateChat {
  action: ACTION;
}

export interface UpdateGameMove {
  action: ACTION;
  input: {
    id: string;
  };
}

export interface UpdateGameReset {
  action: ACTION.RESET;
}

export interface UpdateGameMsg {
  action: ACTION.MSG;
  input: {
    msg: {
      message: string;
      userId: string;
      userName: string;
    };
  };
}
