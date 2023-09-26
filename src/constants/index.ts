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

export const API_HOST = process.env.REACT_APP_API_HOST || '';
