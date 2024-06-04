import style from './GameLog.module.css';
import { PageNotFound, Position, SessionExpired } from '../components';
import { useCallback, useContext, useEffect, useState } from 'react';
import { GameContext, UserContext } from '../context';
import { API_HOST, GAMESTATUS } from '../constants';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { GameInfo } from '../types';
import { CompletedGameData } from '../interfaces';
import { get } from '../utils/http';
import { useMediaQuery } from '../hooks';

export default function GameLog() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { previousPath } = useContext(GameContext);
  const { gameId } = useParams();
  const [game, setGame] = useState<GameInfo | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [loadingResultDetermined, setLoadingResultDetermined] = useState(false);

  const shrinkBoardPositions = useMediaQuery(`(max-width: 600px)`);

  const fetchGameBoard = useCallback(async () => {
    try {
      setLoading(true);
      const completedGames = await get<CompletedGameData[]>(
        `${API_HOST}/api/games`
      );
      if (completedGames && !completedGames.find((g) => g._id === gameId)) {
        setLoading(false);
        setLoadingResultDetermined(true);
        return;
      }
      const result = await get<GameInfo>(`${API_HOST}/api/game-log/${gameId}`);
      setGame(result);
      setLoading(false);
      setLoadingResultDetermined(true);
      navigate(location.pathname, {
        replace: true,
        state: { playersUpdated: result.players },
      });
    } catch (err: any) {
      setGame(undefined);
      setLoading(false);
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        logout();
      }
    }
  }, [gameId, navigate, location.pathname, logout]);

  useEffect(() => {
    fetchGameBoard();
  }, [fetchGameBoard]);

  if (!user) {
    return <SessionExpired styleName={style['loading-result']} />;
  }

  if (!gameId) {
    return (
      <PageNotFound previousPath={previousPath} message="Page not found" />
    );
  }

  if (!game) {
    if (loading) {
      return <span className={style['loading-state']}>Retrieving game</span>;
    } else if (loadingResultDetermined) {
      return (
        <PageNotFound previousPath={previousPath} message="Game not found" />
      );
    } else {
      return (
        <PageNotFound
          previousPath={previousPath}
          message="Game not found - network or server issue. Try again later"
        />
      );
    }
  }

  const gameStateLabel = () => {
    switch (game.status) {
      case GAMESTATUS.WON:
        return `${
          game.positions[game.selectedPositions.slice(-1)[0]].status
        } won!`;
      case GAMESTATUS.DRAWN:
        return `DRAW`;
      default:
        return '';
    }
  };

  const [rows, cols] = game.size;

  const dateInfoString = () => {
    const end = new Date(game.updatedAt).toLocaleString().split(',')[0];
    const start = new Date(game.createdAt).toLocaleString().split(',')[0];
    return end === start ? `@${end}` : `⧖${start} -> ${end}`;
  };

  return (
    <>
      <div className={style.container}>
        <div className={style['game-wrapper']}>
          <div className={style['game-title-state-wrapper']}>
            <span
              className={style['game-title']}
            >{`${`game-${game.gameNumber}`} (${rows}x${cols})`}</span>
            <span className={style['game-state-info']}>{dateInfoString()}</span>
            <span className={style['game-state-info']}>{gameStateLabel()}</span>
          </div>
          <div
            className={style.board}
            style={{
              gridTemplateColumns: `repeat(${cols}, ${
                cols > 7 && shrinkBoardPositions ? 2 : 3
              }rem)`,
            }}
          >
            {game.positions.map((p, idx) => (
              <Position
                cols={cols}
                shrinkBoardPositions={shrinkBoardPositions}
                key={p._id}
                id={p._id}
                posId={idx}
                positionStatus={p.status}
                gameStatus={game.status}
              >
                {game.selectedPositions.includes(idx) &&
                  game.selectedPositions.indexOf(idx) + 1}
              </Position>
            ))}
          </div>
          <div className={style['control-buttons']}>
            <button className={style.button} onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
