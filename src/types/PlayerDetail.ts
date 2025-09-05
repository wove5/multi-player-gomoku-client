import { POSITION_STATUS } from '../constants';

export type PlayerDetail = {
  user: {
    _id: string;
    userName: string;
  }
  color: POSITION_STATUS;
};
