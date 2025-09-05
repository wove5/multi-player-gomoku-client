import { PlayerDetail } from '../types';

export interface IncompleteGameData {
  _id: string;
  gameNumber: number;
  size: number[];
  isMulti: boolean;
  createdAt: Date;
  players: PlayerDetail[];
}
