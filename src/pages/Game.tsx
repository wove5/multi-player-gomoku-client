import style from './Game.module.css';
import { Message, PageNotFound, Position, SessionExpired } from '../components';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GameContext, UserContext } from '../context';
import { POSITION_STATUS, GAMESTATUS, API_HOST, ACTION } from '../constants';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { del, get, put } from '../utils/http';
import { EnterLeaveGame, GameInfo, ResetGame, UpdateGame } from '../types';
import { IncompleteGameData } from '../interfaces';
import { GameStatus } from '../types/GameStatus';

export default function Game() {
  const navigate = useNavigate();
  // const { state } = useLocation();
  // need to make use of location object in useEffect.
  const location = useLocation();
  // state will only be allocated from Home page on first programmatic nav to this page
  const state = location.state;

  const { user, logout } = useContext(UserContext);
  const { previousPath } = useContext(GameContext);

  const { gameId = '' } = useParams();

  const [game, setGame] = useState<GameInfo | undefined>(
    state === null || state.game === undefined ? undefined : state.game
  );

  // gameBackup will receive and pass on the Users/Players' details from location.state
  const [gameBackup, setGameBackup] = useState<GameInfo | undefined>(
    state === null || state.gameBackup === undefined
      ? undefined
      : state.gameBackup
  );

  // create a websocket client connection
  const ws = useMemo(() => new WebSocket('ws://localhost:8080'), []);

  // infer player from game if loaded via state, otherwise, just set to BLACK for now - it is set again in useEffect
  const [player, setPlayer] = useState<POSITION_STATUS>(
    state === null || state.game === undefined
      ? POSITION_STATUS.BLACK
      : () => {
          const currentBoardPositions = state.game.positions;
          const selectedPositionNumbers = state.game.selectedPositions;
          const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
          return lastSelectedPositionNumber.length === 0
            ? POSITION_STATUS.BLACK
            : currentBoardPositions[lastSelectedPositionNumber[0]].status ===
              POSITION_STATUS.BLACK
            ? POSITION_STATUS.WHITE
            : POSITION_STATUS.BLACK;
        }
  );

  const [loading, setLoading] = useState(true);
  const [loadingResultDetermined, setLoadingResultDetermined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const fetchGameBoard = useCallback(async () => {
    try {
      const incompleteGames = await get<IncompleteGameData[]>(
        `${API_HOST}/api`
      );
      if (incompleteGames && !incompleteGames.find((g) => g._id === gameId)) {
        setLoading(false);
        setLoadingResultDetermined(true);
        return;
      }
      const result = await get<GameInfo>(`${API_HOST}/api/game/${gameId}`);
      setGame(result);
      setGameBackup(result);
      setLoading(false);
      setLoadingResultDetermined(true);
      const currentBoardPositions = result.positions;
      const selectedPositionNumbers = result.selectedPositions;
      const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
      setPlayer(
        lastSelectedPositionNumber.length === 0
          ? POSITION_STATUS.BLACK
          : currentBoardPositions[lastSelectedPositionNumber[0]].status ===
            POSITION_STATUS.BLACK
          ? POSITION_STATUS.WHITE
          : POSITION_STATUS.BLACK
      );
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
  }, [logout, gameId]);

  useEffect(() => {
    // state.game needs to be removed on first page-load navigating from Home, otherwise any page refresh will reload stale data from state.game
    // Hence, any page refreshes or direct-nav's will pull game data from server API & DB
    // navigate(location.pathname, { replace: true }); // replacing this with the version below - need to maintain gameBackup
    navigate(location.pathname, {
      replace: true,
      state: { gameBackup: gameBackup },
    });
    // a page reload or direct nav will set game to undefined via useState hook, so fetchGameBoard will be triggered
    if (!game) fetchGameBoard(); // another reason to run this conditionally is to prevent an infinite loop occurring
    // if game hadn't been preloaded via react router state, fetchGameBoard will set player correctly
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('closing websocket connection');
        ws.close();
      }
    };
  }, [game, fetchGameBoard, navigate, location.pathname, gameBackup, ws]);

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

  const updateGame = async (id: string, posId: number) => {
    if (
      // a selection had already been made but the db update failed
      // (this is operating on the client side end only)
      game.positions[game.selectedPositions.slice(-1)[0]]?.status ===
      POSITION_STATUS.YELLOW
    ) {
      // set game back to previous state by undoing the last attempted selection
      const originalPositions = game.positions.map((p) =>
        p._id === game.positions[game.selectedPositions.slice(-1)[0]]._id
          ? { ...p, status: POSITION_STATUS.NONE }
          : p
      );
      const originalSelectedPositions = game.selectedPositions.slice(0, -1);

      const newPositions = originalPositions.map((p) => {
        return p._id === id ? { ...p, status: player } : p;
      });
      const newSelectedPositions = [...originalSelectedPositions, posId];

      setGame({
        ...game,
        positions: newPositions,
        selectedPositions: newSelectedPositions,
      });
    }

    setErrorMessage('');
    // carry out the selection operation and try making all the necessary updates in the database
    setUpdating(true);
    const newPositions = game.positions.map((p) => {
      return p._id === id ? { ...p, status: player } : p;
    });
    const newSelectedPositions = [...game.selectedPositions, posId];
    setGame({
      ...game,
      positions: newPositions,
      selectedPositions: newSelectedPositions,
    });
    try {
      // update game in db
      const result = await put<UpdateGame, GameStatus>(
        `${API_HOST}/api/game/${gameId}`,
        {
          id: id,
        }
      );
      if (result.status !== GAMESTATUS.ACTIVE) {
        setGame({
          ...game,
          status: result.status, // status is the one that needs updating, but
          positions: newPositions, // need to set positions & selectedPositions again
          selectedPositions: newSelectedPositions, // otherwise ...game will overwrite them with their original values
        });
      } else {
        setPlayer(
          result.player === POSITION_STATUS.BLACK
            ? POSITION_STATUS.WHITE
            : POSITION_STATUS.BLACK
        );
      }
      setUpdating(false);
    } catch (err: any) {
      // for any failed database updates
      // carry out the following selection operation
      const newPositions = game.positions.map((p) => {
        return p._id === id ? { ...p, status: POSITION_STATUS.YELLOW } : p;
      });
      const newSelectedPositions = [...game.selectedPositions, posId];
      setGame({
        ...game,
        positions: newPositions,
        selectedPositions: newSelectedPositions,
      });
      setUpdating(false);
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        setErrorMessage(err.message);
        logout();
      }
      setErrorMessage(
        `Something went wrong. Your selected position is not confirmed yet.
         it is marked in yellow for now. You can try selecting it again 
         or you can choose a different position if you wish.`
      );
    }
  };

  const resetGame = async () => {
    try {
      setErrorMessage('');
      const result = await put<ResetGame, GameInfo>(
        `${API_HOST}/api/game/${gameId}`,
        {
          status: POSITION_STATUS.NONE,
        }
      );
      setGame(result);
      setPlayer(POSITION_STATUS.BLACK);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const deleteGame = async () => {
    try {
      setErrorMessage('');
      await del(`${API_HOST}/api/game/${gameId}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const leaveGame = async () => {
    try {
      setErrorMessage('');
      await put<EnterLeaveGame, GameInfo>(`${API_HOST}/api/game/${gameId}`, {
        action: ACTION.LEAVE,
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const gameStateLabel = () => {
    switch (game.status) {
      case GAMESTATUS.ACTIVE:
        return `Current Player: ${player}`;
      case GAMESTATUS.WON:
        return `${player} won!`;
      case GAMESTATUS.DRAWN:
        return `DRAW`;
      default:
        return '';
    }
  };
  const [rows, cols] = game.size;
  const dateInfoString = `created ${
    new Date(game.createdAt).toLocaleString().split(',')[0]
  }`;

  return (
    <>
      <div className={style.container}>
        <div className={style['game-wrapper']}>
          <div className={style['game-title-state-wrapper']}>
            <span
              className={style['game-title']}
            >{`${`game-${game.gameNumber}`} (${rows}x${cols})`}</span>
            <span className={style['game-state-info']}>{dateInfoString}</span>
            <span className={style['game-state-info']}>{gameStateLabel()}</span>
          </div>
          <div
            className={style.board}
            style={{
              gridTemplateColumns: `repeat(${cols}, 3rem)`,
            }}
          >
            {game.positions.map((p, idx) => (
              <Position
                key={p._id}
                id={p._id}
                posId={idx}
                positionStatus={p.status}
                gameStatus={game.status}
                addSelectedPosition={updateGame}
                updating={updating}
              />
            ))}
          </div>
          <div className={style['control-buttons']}>
            {game.status === GAMESTATUS.ACTIVE && (
              <>
                {' '}
                {game.players.length === 1 && (
                  <button className={style.button} onClick={() => resetGame()}>
                    Restart
                  </button>
                )}
                <button className={style.button} onClick={() => navigate('/')}>
                  Pause
                </button>
              </>
            )}
            <button
              className={style.button}
              onClick={async () => {
                if (game.status === GAMESTATUS.ACTIVE) {
                  if (game.players.length === 1) {
                    await deleteGame();
                  } else {
                    await leaveGame();
                  }
                  navigate('/', { replace: true });
                } else {
                  navigate('/games', { replace: true });
                }
              }}
            >
              Leave
            </button>
          </div>
          {errorMessage && (
            <div className={style['error-message']}>
              {<Message variant="error" message={errorMessage} />}
            </div>
          )}
          {updating && (
            <span className={style['loading-state']}>updating game</span>
          )}
        </div>
      </div>
    </>
  );
}
