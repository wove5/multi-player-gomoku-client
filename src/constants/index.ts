export enum POSITION_STATUS {
  BLACK = 'BLACK',
  WHITE = 'WHITE',
  NONE = 'NONE',
  YELLOW = 'YELLOW',
}

export enum PLAYER {
  BLACK = 'BLACK',
  WHITE = 'WHITE',
}

export enum GAMESTATUS {
  ACTIVE = 'ACTIVE',
  WON = 'WON',
  DRAWN = 'DRAWN',
}

export enum ACTION {
  RESUME = 'RESUME',
  JOIN = 'JOIN',
  LEAVE = 'LEAVE',
}

export const API_HOST = process.env.REACT_APP_API_HOST || '';
