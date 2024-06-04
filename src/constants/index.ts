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
  JOIN = 'JOIN',
  REENTER = 'REENTER',
  LEAVE = 'LEAVE',
  MOVE = 'MOVE',
  REST = 'REST',
  RESET = 'RESET',
}

export enum PLAYER_STATE {
  RESTING = 'RESTING',
  PLAYING = 'PLAYING',
}

export enum GAME_MODE {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
  NONE = 'NONE',
}

export enum GAME_BOARD_ALIGN {
  LEFT = 'LEFT',
  CENTRE = 'CENTRE',
  RIGHT = 'RIGHT',
}

export const API_HOST = process.env.REACT_APP_API_HOST || '';
