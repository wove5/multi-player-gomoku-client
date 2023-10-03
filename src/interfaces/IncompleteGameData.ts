import { PLAYER } from '../constants';

export interface IncompleteGameData {
  _id: string;
  gameNumber: number;
  size: number[];
  isMulti: boolean;
  createdAt: Date;
  players: { userId: string; color: PLAYER }[];
  users: { userId: string; username: string }[];
}
