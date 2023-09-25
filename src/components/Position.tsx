import { PropsWithChildren } from 'react';
import { GAMESTATUS, POSITION_STATUS } from '../constants';

import style from './Position.module.css';

interface PositionProps {
  id: string;
  posId: number;
  positionStatus: POSITION_STATUS;
  gameStatus: GAMESTATUS;
  // addSelectedPosition is used in game page, not used in game-log page
  addSelectedPosition?: (id: string, posId: number) => Promise<void>;
  updating?: boolean;
}

export default function Position(props: PropsWithChildren<PositionProps>) {
  const {
    id,
    posId,
    positionStatus,
    gameStatus,
    addSelectedPosition,
    updating,
  } = props;

  const getClassNames = () => {
    const className = style.position;
    switch (true) {
      case positionStatus === POSITION_STATUS.YELLOW:
        return style.error;
      case positionStatus === POSITION_STATUS.BLACK:
        return style.black;
      case positionStatus === POSITION_STATUS.WHITE:
        return style.white;
      case positionStatus === POSITION_STATUS.NONE &&
        gameStatus !== GAMESTATUS.ACTIVE:
        return style.inactive;
      default:
        return className;
    }
  };

  const handleClick = () => {
    if (
      updating ||
      positionStatus === POSITION_STATUS.WHITE ||
      positionStatus === POSITION_STATUS.BLACK ||
      gameStatus !== GAMESTATUS.ACTIVE
    )
      return;
    // addSelectedPosition fnc. is optional and may not present
    addSelectedPosition && addSelectedPosition(id, posId);
  };

  return (
    <div className={style.outer}>
      <div className={getClassNames()} onClick={handleClick}>
        {props.children}
      </div>
    </div>
  );
}
