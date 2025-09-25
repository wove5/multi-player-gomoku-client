import { PropsWithChildren } from 'react';
import { GAMESTATUS, POSITION_STATUS } from '../constants';

import style from './Position.module.css';

interface PositionProps {
  cols: number;
  shrinkBoardPositions: boolean;
  hideLeftRightBtns?: boolean;
  shrinkBoard?: boolean;
  id: string;
  posId: number;
  positionStatus: POSITION_STATUS;
  isLastMove?: boolean;
  gameStatus: GAMESTATUS;
  // addSelectedPosition is used in game page, not used in game-log page
  addSelectedPosition?: (id: string, posId: number) => Promise<void>;
  expandBoard?: () => void;
  myTurn?: boolean;
  updating?: boolean;
}

export default function Position(props: PropsWithChildren<PositionProps>) {
  const {
    cols,
    shrinkBoardPositions,
    hideLeftRightBtns,
    shrinkBoard,
    id,
    posId,
    positionStatus,
    isLastMove,
    gameStatus,
    addSelectedPosition,
    expandBoard,
    myTurn,
    updating,
  } = props;

  const getClassNames = () => {
    const className = style.position;
    switch (true) {
      case positionStatus === POSITION_STATUS.YELLOW:
        return style.error;
      case positionStatus === POSITION_STATUS.BLACK &&
        isLastMove:
        return `${style['last-move']} ${style.black}`
      case positionStatus === POSITION_STATUS.WHITE &&
        isLastMove:
        return `${style['last-move']} ${style.white}`
      case positionStatus === POSITION_STATUS.BLACK:
        return style.black;
      case positionStatus === POSITION_STATUS.WHITE:
        return style.white;
      case positionStatus === POSITION_STATUS.NONE &&
        gameStatus !== GAMESTATUS.ACTIVE:
        return style.inactive;
      case positionStatus === POSITION_STATUS.NONE && !myTurn:
        return style.inactive;
      case hideLeftRightBtns && shrinkBoard:
        return style.inactive;
      default:
        return className;
    }
  };

  const handleClick = () => {
    if (hideLeftRightBtns && shrinkBoard) {
      expandBoard && expandBoard();
      return;
    } else if (
      updating ||
      positionStatus === POSITION_STATUS.WHITE ||
      positionStatus === POSITION_STATUS.BLACK ||
      gameStatus !== GAMESTATUS.ACTIVE ||
      !myTurn
    ) {
      return;
    }
    // addSelectedPosition fnc. is optional and may not present
    addSelectedPosition && addSelectedPosition(id, posId);
  };

  return (
    <div
      className={`${style.outer}${
        cols > 7 && shrinkBoardPositions ? ' ' + style['outer-shrunk'] : ''
      }${
        hideLeftRightBtns && shrinkBoard
          ? ' ' + style['outer-board-shrunk']
          : ''
      }`}
    >
      <div
        className={`${getClassNames()}${
          cols > 7 && shrinkBoardPositions ? ' ' + style['position-shrunk'] : ''
        }${
          hideLeftRightBtns && shrinkBoard
            ? ' ' + style['position-board-shrunk']
            : ''
        }`}
        onClick={handleClick}
      >
        {props.children}
      </div>
    </div>
  );
}
