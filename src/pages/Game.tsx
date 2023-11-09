import style from './Game.module.css';
import { Message, PageNotFound, Position, SessionExpired } from '../components';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GameContext, UserContext } from '../context';
import {
  POSITION_STATUS,
  GAMESTATUS,
  API_HOST,
  ACTION,
  PLAYER,
} from '../constants';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { del, get, put } from '../utils/http';
import {
  EnterLeaveGame,
  GameInfo,
  PlayerDetail,
  ResetGame,
  UpdateGame,
} from '../types';
import { IncompleteGameData, RestFromGameReply } from '../interfaces';
import { GameStatus } from '../types/GameStatus';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const getWebSocketURL = () => {
  if (!API_HOST) return `ws://localhost:8080`;
  const hostURL = new URL(API_HOST);
  return `${hostURL.protocol === 'https:' ? `wss` : `ws`}://${
    hostURL.hostname
  }`;
};

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

  // gameBackup will receive and pass on the Users/Players' details from location.state to Header
  // const [gameBackup, setGameBackup] = useState<GameInfo | undefined>(
  //   state === null || state.gameBackup === undefined
  //     ? undefined
  //     : state.gameBackup
  // );

  // const [userDetail, setUserDetail] = useState<UserDetail | undefined>(
  //   state === null || state.userDetail === undefined
  //     ? undefined
  //     : state.userDetail
  // );

  const [players, setPlayers] = useState<PlayerDetail[] | undefined>(
    state === null || state.players === undefined ? undefined : state.players
  );

  // create a websocket client connection
  const ws = useMemo(() => new WebSocket(getWebSocketURL()), []);

  const notify = (message: string) => toast(message);

  // infer player from game if loaded via state, otherwise, just set to BLACK for now - it is set again in useEffect
  const [player, setPlayer] = useState<PLAYER>(
    state === null || state.game === undefined
      ? PLAYER.BLACK
      : () => {
          const currentBoardPositions = state.game.positions;
          const selectedPositionNumbers = state.game.selectedPositions;
          const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
          return lastSelectedPositionNumber.length === 0
            ? PLAYER.BLACK
            : currentBoardPositions[lastSelectedPositionNumber[0]].status ===
              POSITION_STATUS.BLACK
            ? PLAYER.WHITE
            : PLAYER.BLACK;
        }
  );

  const [loading, setLoading] = useState(true);
  const [loadingResultDetermined, setLoadingResultDetermined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const fetchGameBoard = useCallback(async () => {
    console.log(`trying an API call`);
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
      // setGameBackup(result);
      // setUserDetail(result.userDetail);
      setPlayers(result.players);
      setLoading(false);
      setLoadingResultDetermined(true);
      const currentBoardPositions = result.positions;
      const selectedPositionNumbers = result.selectedPositions;
      const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
      setPlayer(
        lastSelectedPositionNumber.length === 0
          ? PLAYER.BLACK
          : currentBoardPositions[lastSelectedPositionNumber[0]].status ===
            POSITION_STATUS.BLACK
          ? PLAYER.WHITE
          : PLAYER.BLACK
      );
      console.log(`game successfully retrieved from API`);
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
  }, [gameId, logout]);

  const restFromGame = useCallback(async () => {
    try {
      console.log(`Sending put request to Rest from game`);
      const result = await put<EnterLeaveGame, RestFromGameReply>(
        // await put<EnterLeaveGame, RestFromGameReply>(
        `${API_HOST}/api/game/${gameId}`,
        {
          action: ACTION.REST,
        }
      );
      console.log(result);
      return result;
    } catch (error) {
      console.log('something went wrong with taking Rest');
    }
  }, [gameId]);

  useEffect(() => {
    // state.game needs to be removed on first page-load navigating from Home, otherwise any page refresh will reload stale data from
    // location.state.game into the component's "game" state via useState and will be rendered to the DOM instead of fresh data from the API/DB.
    console.log(`re-navigating to clear state.game`);
    // const playersBackup =
    //   state === null || state.players === undefined ? undefined : state.players;
    navigate(location.pathname, {
      replace: true,
      // state: { gameBackup: gameBackup }
      // need to specify the following, even if it was already present & correct because replace:true overwrites state
      // state: { userDetail: userDetail },
      state: { players: players },
      // state: { players: playersBackup },
      // however, game is deliberately excluded, so that the designed logic will work meaning that
      // any subsequent page refreshes or direct-nav's will pull game data from server API & DB.
    });

    if (game && user) {
      console.log(`game has already been set in component`);
      console.log(`about to subscribe to websocket`);
      ws.onmessage = (event) => {
        console.log(`incoming msg ~~~`);
        try {
          const data = JSON.parse(event.data);
          console.log(`Object.entries(data) = ${Object.entries(data)}`);
          if (
            typeof data === 'object' &&
            data.updatedBy !== user._id &&
            'action' in data
          ) {
            console.log(`data.action = ${data.action}`);
            if (data.action === ACTION.JOIN) {
              // setGame(data.game); // don't do this, it will reload the whole page
              navigate(location.pathname, {
                replace: true,
                // state: { gameBackup: data.game }, // state.players is retained & updated, but state.game is removed
                state: { players: data.players },
              });
              const msg = data.players.find(
                (p: PlayerDetail) => p.userId !== user._id
              ).userName;
              notify(`${msg} joined game`);
            } else if (data.action === ACTION.REENTER) {
              // navigate(location.pathname, {
              //   replace: true,
              //   // state: { gameBackup: data.game }, // state.players is retained & updated, but state.game is removed
              //   state: { players: data.players },
              // });
              const msg = data.players.find(
                (p: PlayerDetail) => p.userId !== user._id
              ).userName;
              notify(`${msg} re-entered game`);
            } else if (data.action === ACTION.LEAVE) {
              const msg = data.players.find(
                (p: PlayerDetail) => p.userId !== user._id
              ).userName;
              const updatedPlayers = data.players.filter(
                (p: PlayerDetail) => p.userId !== data.updatedBy
              );
              navigate(location.pathname, {
                replace: true,
                state: { players: updatedPlayers },
              });
              notify(`${msg} left game`);
            } else if (data.action === ACTION.REST) {
              const msg = data.players.find(
                (p: PlayerDetail) => p.userId !== user._id
              )?.userName;
              notify(`${msg} taking rest`);
            } else if (data.action === ACTION.MOVE) {
              // navigate(location.pathname, {
              //   replace: true,
              //   state: { players: data.players },
              // });
              const msg = data.players.find(
                (p: PlayerDetail) => p.userId !== user._id
              ).userName;
              notify(`${msg}, made move`);
            }
          }
        } catch (e) {
          console.log(e);
        }
      };
      console.log(
        `${
          players
            ? players.find((p: PlayerDetail) => p.userId === user._id)?.userName
            : undefined
        } connected to websocket`
      );
    } else {
      // If game hadn't been preloaded via react router state, fetchGameBoard will set player correctly.
      // A page reload or direct nav will set component game state to undefined, so fetchGameBoard will be triggered.
      // Another reason to run this conditionally is to prevent an infinite loop occurring.
      // After passing through this branch, useEffect runs a second time, where it will setup websocket in other branch
      console.log(`game is not set in component`);
      console.log(`calling fetchGameBoard`);
      fetchGameBoard();
    }
    return () => {
      if (ws.readyState === WebSocket.OPEN && game) {
        // added game to condition to prevent ws connect breaking on page refresh
        console.log(
          `${
            players
              ? players.find((p: PlayerDetail) => p.userId === user?._id)
                  ?.userName
              : undefined
          } closing websocket connection`
        );
        // although this will always run on page unmounting, the Leave game event
        // will be handled and discarded appropriately by the server
        restFromGame();
        ws.close();
      }
    };
  }, [
    ws,
    user,
    fetchGameBoard,
    navigate,
    location.pathname,
    game,
    players,
    restFromGame,
  ]);

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
      // if a selection had already been made but the db update had failed
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
        return p._id === id
          ? {
              ...p,
              status:
                player === PLAYER.BLACK
                  ? POSITION_STATUS.BLACK
                  : POSITION_STATUS.WHITE,
            }
          : p;
      });
      const newSelectedPositions = [...originalSelectedPositions, posId];

      setGame({
        ...game,
        positions: newPositions,
        selectedPositions: newSelectedPositions,
      });
    }

    const findMe = players?.find((p: PlayerDetail) => p.userId === user?._id);

    if (
      game.isMulti &&
      findMe?.color.toString() !== player.toString()
      // findMe?.color.toString() ===
      //   game.positions[game.selectedPositions.slice(-1)[0]].status.toString()
    ) {
      // abort here if not player's turn
      return;
    }
    // const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
    // return lastSelectedPositionNumber.length === 0
    //   ? PLAYER.BLACK
    //   : currentBoardPositions[lastSelectedPositionNumber[0]].status ===
    //     POSITION_STATUS.BLACK
    //   ? PLAYER.WHITE
    //   : PLAYER.BLACK;

    setErrorMessage('');
    // carry out the selection operation and try making all the necessary updates in the database
    setUpdating(true);
    const newPositions = game.positions.map((p) => {
      return p._id === id
        ? {
            ...p,
            status:
              player === PLAYER.BLACK
                ? POSITION_STATUS.BLACK
                : POSITION_STATUS.WHITE,
          }
        : p;
    });
    const newSelectedPositions = [...game.selectedPositions, posId];
    // set positions & selectedPositions ahead of the api call to make it appear more responsive
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
      setGame({
        ...game,
        status: result.status, // status is the one that needs updating, but
        positions: newPositions, // need to set positions & selectedPositions again
        selectedPositions: newSelectedPositions, // otherwise ...game will overwrite them with their original values
      });
      // set the player to whatever the server sends back
      setPlayer(result.player);
      // if (result.status !== GAMESTATUS.ACTIVE) {
      //   setGame({
      //     ...game,
      //     status: result.status, // status is the one that needs updating, but
      //     positions: newPositions, // need to set positions & selectedPositions again
      //     selectedPositions: newSelectedPositions, // otherwise ...game will overwrite them with their original values
      //   });
      // } else {
      //   setPlayer(
      //     //result.player === POSITION_STATUS.BLACK ? PLAYER.WHITE : PLAYER.BLACK
      //     // the server will set the player correctly and send in it's res object
      //     // result.player === POSITION_STATUS.BLACK ? PLAYER.BLACK : PLAYER.WHITE
      //     result.player
      //   );
      // }
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
      setPlayer(PLAYER.BLACK);
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

      setPlayers(players?.filter((p) => p.userId !== user._id));
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
                {state.players.length === 1 && (
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
                  await leaveGame();
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
      <ToastContainer
        position="top-center"
        // autoClose={false}
        className={style['toast-container']}
        toastClassName={style['toast-wrapper']}
      />
    </>
  );
}
