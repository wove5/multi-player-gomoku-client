import style from './Game.module.css';
import {
  Chat,
  Message,
  PageNotFound,
  Position,
  SessionExpired,
} from '../components';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
// import { useWhatChanged } from '@simbathesailor/use-what-changed';
import { GameContext, UserContext } from '../context';
import {
  POSITION_STATUS,
  GAMESTATUS,
  API_HOST,
  ACTION,
  PLAYER,
  GAME_BOARD_ALIGN,
} from '../constants';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { get, put } from '../utils/http';
import {
  EnterLeaveGame,
  GameInfo,
  PlayerDetail,
  ResetGame,
  UpdateGame,
} from '../types';
import { CompletedGameData, IncompleteGameData } from '../interfaces';
import { GameStatus } from '../types/GameStatus';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useMediaQuery } from '../hooks';
import { CustomWebSocket } from '../classes';
import Fireworks from 'react-canvas-confetti/dist/presets/fireworks';

const getWebSocketURL = () => {
  // if (!API_HOST) return `ws://localhost:8080`;
  if (!API_HOST) return `ws://${window.location.hostname}:8080`;
  const hostURL = new URL(API_HOST);
  return `${hostURL.protocol === 'https:' ? `wss` : `ws`}://${
    hostURL.hostname
  }`;
};

export default function Game() {
  const navigate = useNavigate();
  // need to make use of location object in useEffect.
  const location = useLocation();
  // state will only be allocated from Home page on first programmatic nav to this page
  const state = location.state;

  const { user, logout } = useContext(UserContext);
  const { previousPath, players, setWs, headerHeight, windowIsActive } =
    useContext(GameContext);

  // const me: PlayerDetail | undefined = useMemo(
  //   () =>
  //     players
  //       ? players.find((p: PlayerDetail) => p.userId === user?._id)
  //       : undefined,
  //   [players, user?._id]
  // );
  const otherPlayer: PlayerDetail | undefined = useMemo(
    () =>
      players
        ? players.find((p: PlayerDetail) => p.userId !== user?._id)
        : undefined,
    [players, user?._id]
  );

  const { gameId = '' } = useParams();
  console.log(`inside Game, running Game fnc; gameId param = ${gameId}`);

  const [game, setGame] = useState<GameInfo | undefined>(
    state === null || state === undefined || state.game === undefined
      ? undefined
      : state.game
  );

  const [gameBoardAlign, setGameBoardAlign] = useState<GAME_BOARD_ALIGN>(
    GAME_BOARD_ALIGN.CENTRE
  );

  const [rows, cols] = game ? game.size : [0, 0];
  const gameWrapperWidth =
    cols * 3 + (cols - 1) * 0.5 + (1 + 1) + (1.25 + 1.25);
  const chatWrapperWidth = 2 * (15 + 2 * (1.25 + 0.625));
  const thresholdWidth = 6.5 + gameWrapperWidth + 15 + 2 * (1.25 + 0.625) + 6;
  const hideLeftRightBtns = useMediaQuery(`(max-width: ${thresholdWidth}rem)`);
  const maxThresholdWidthGameCentred = gameWrapperWidth + chatWrapperWidth + 8;
  const maxChatWrapperWidth = chatWrapperWidth + 3;
  const shrinkBoardPositions = useMediaQuery(`(max-width: 600px)`);

  const [shrinkBoard, setShrinkBoard] = useState(false);

  interface Message {
    message: string;
    userId: string;
    userName: string;
  }
  const [messages, setMessages] = useState<Array<Message>>([]);

  // create a websocket client connection
  const ws = useMemo(
    () =>
      // new WebSocket(`${getWebSocketURL()}?gameId=${gameId}`, [
      new CustomWebSocket(`${getWebSocketURL()}?gameId=${gameId}`, [
        'chat',
        `${user?.token}`,
      ]),
    [gameId, user?.token]
  );

  const notify = (message: string) => toast(message);

  // infer player from game if loaded via state, otherwise, just set to BLACK for now - it is set again in useEffect
  const [player, setPlayer] = useState<PLAYER>(
    state === null || state === undefined || state.game === undefined
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
      const completedGames = await get<CompletedGameData[]>(
        `${API_HOST}/api/games`
      );
      const completedGame =
        completedGames && completedGames.find((g) => g._id === gameId);
      const incompleteGame =
        incompleteGames && incompleteGames.find((g) => g._id === gameId);
      if (!completedGame && !incompleteGame) {
        setLoading(false);
        setLoadingResultDetermined(true);
        return;
      }
      const result = incompleteGame
        ? await get<GameInfo>(`${API_HOST}/api/game/${gameId}`)
        : await get<GameInfo>(`${API_HOST}/api/game-log/${gameId}`);
      setGame(result);
      setLoading(false);
      setLoadingResultDetermined(true);
      const currentBoardPositions = result.positions;
      const selectedPositionNumbers = result.selectedPositions;
      const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
      setPlayer(
        lastSelectedPositionNumber.length === 0
          ? PLAYER.BLACK
          : () => {
              const lastSelectedPositionColor =
                currentBoardPositions[lastSelectedPositionNumber[0]].status;
              // result.status is available immediately, game?.status is not.
              if (result.status === GAMESTATUS.ACTIVE) {
                return lastSelectedPositionColor === POSITION_STATUS.BLACK
                  ? PLAYER.WHITE
                  : PLAYER.BLACK;
              } else
                return lastSelectedPositionColor === POSITION_STATUS.BLACK
                  ? PLAYER.BLACK
                  : PLAYER.WHITE;
            }
      );
      navigate(location.pathname, {
        replace: true,
        state: { playersUpdated: result.players, gameId },
      });
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
  }, [gameId, location.pathname, logout, navigate]);

  const updateGameFromOtherPlayer = useCallback(
    (
      id: string,
      posId: number,
      status: GAMESTATUS,
      color: PLAYER,
      player: PLAYER
    ) => {
      if (game) {
        const newPositions = game.positions.map((p) => {
          return p._id === id
            ? {
                ...p,
                status:
                  color === PLAYER.BLACK
                    ? POSITION_STATUS.BLACK
                    : POSITION_STATUS.WHITE,
              }
            : p;
        });
        const newSelectedPositions = [...game.selectedPositions, posId];
        setGame({
          ...game,
          status,
          positions: newPositions,
          selectedPositions: newSelectedPositions,
        });
        setPlayer(player);
      } else {
        return;
      }
    },
    [game]
  );

  const updateMessages = useCallback((msg: Message) => {
    // setMessages([
    //   ...messages,
    //   { message: msg.message, userId: msg.userId, userName: msg.userName },
    // ]);

    // the functional update ensures messages is not referenced directly and does not trigger rerenders.
    setMessages((messages) => [
      ...messages,
      {
        message: msg.message,
        userId: msg.userId,
        userName: msg.userName,
      },
    ]);
  }, []);

  // // a handy utility for use in dev mode.
  // useWhatChanged(
  //   [
  //     ws,
  //     user,
  //     fetchGameBoard,
  //     navigate,
  //     location.pathname,
  //     state.players,
  //     state.game,
  //     restFromGame,
  //     gameId,
  //     updateGameFromOtherPlayer,
  //     state.playersUpdated,
  //     game,
  //     otherPlayer,
  //     updateMessages,
  //     setWs,
  //   ],
  //   'ws, user, fetchGameBoard, navigate, location.pathname, state.players, state.game, restFromGame, gameId, updateGameFromOtherPlayer, state.playersUpdated, game, otherPlayer, updateMessages, setWs'
  // );

  let lastPingTime: React.MutableRefObject<number> = useRef(Date.now());

  //TODO: keep an ongoing eye out for TypeError "Cannot read properties of undefined (reading 'find')"... error occurred once on mobile
  //TODO: during testing but was not able to be replicated or narrowed down to the particular array.find() method in this file.
  //TODO: In an attempt to prevent error reappearing, conditional chaining has been added to the 3 suspected instances of the find method as in:
  //TODO: (state?.playersUpdated || state?.players)?.find(...

  useEffect(() => {
    // state.game needs to be removed on first page-load navigating from Home, otherwise any page refresh will reload stale data from
    // location.state.game into the component's "game" state via useState and will be rendered to the DOM instead of fresh data from the API/DB.
    if (state?.game !== undefined) {
      // this should only be so on the very first rendering/loading of game page

      navigate(location.pathname, {
        replace: true,
        // need to specify the following, even if it was already present & correct because replace:true overwrites state
        state: { playersUpdated: state.players, gameId: state.game._id },
        // however, game is deliberately excluded, so that the designed logic will work meaning that
        // subsequent page refreshes or direct-nav's will pull game data from server API & DB via alt. branch.
      });
    } else if (!game) {
      fetchGameBoard();
      // If game hadn't been preloaded via react router state, fetchGameBoard will set player correctly.
      // A page reload or direct nav will set component game state to undefined, so fetchGameBoard will be triggered.
      // Another reason to run this conditionally is to prevent an infinite loop occurring.
    }
    setWs(ws);
    let msg = '';

    if (!user) return;

    if (ws.readyState === CustomWebSocket.OPEN) {
      console.log(
        `In Game useEffect fnc setup: ws.readyState = ${ws.readyState}`
      );
      ws.send(
        `user with user id: ${user._id} going through useEffect setup - client side.`
      );
    }

    // secondary timer for checking ws expiration, as ws.pingTimeout disappears when
    // websocket is closed.
    const checkInterval = setInterval(() => {
      // console.log('running checkInterval to check last ping time');
      // the following will apply when server drops connection; the client has no way
      // of knowing, so force a page reload which will recreate the connection and
      // destroy the old one if it does still exists (it likely doesn't exist)
      if (
        Date.now() - lastPingTime.current >
        11000
        // && ws.readyState !== CustomWebSocket.OPEN // tbc, but should not be necessary
      ) {
        window.location.reload();
        return;
      }
    }, 10000);

    function heartbeat(this: CustomWebSocket) {
      // primary timer for closing ws connection on non-detection of server pings
      clearTimeout(this.pingTimeout);
      this.pingTimeout = setTimeout(() => {
        console.log('pingTimeout expired - Game component closing ws');
        this.close();
      }, 10000 + 1000);
      lastPingTime.current = Date.now();
    }

    // ws.pingTimeout = setTimeout(() => {
    //   console.log('pingTimeout expired -  Game component closing ws');
    //   ws.close();
    // }, 10000 + 1000);

    // ws.onopen = function (this: CustomWebSocket) {
    //   clearTimeout(this.pingTimeout);
    //   this.pingTimeout = setTimeout(() => {
    //     console.log('pingTimeout expired -  Game component closing ws');
    //     this.close();
    //   }, 10000 + 1000);
    // };
    ws.onopen = heartbeat;
    ws.onclose = function clear(this: CustomWebSocket) {
      console.log('clearing Timeout');
      clearTimeout(this.pingTimeout);
    };
    ws.onmessage = function handleMessage(this: CustomWebSocket, event) {
      // console.log(`incoming msg ~~~`);
      try {
        // console.log(event.data);
        const data = JSON.parse(event.data.toString());
        // console.log(data);
        if (
          typeof data === 'object' &&
          // data.updatedBy !== user._id &&
          'action' in data &&
          'userId' in data &&
          data.userId === user._id &&
          data.action === 'ping'
        ) {
          // console.log(`reacting to incoming ping`);
          // update latest ping time
          lastPingTime.current = Date.now();
          clearTimeout(this.pingTimeout);
          // reset timeout
          this.pingTimeout = setTimeout(() => {
            console.log(
              'ping timeout occurred; Game component closing websocket'
            );
            this.send('client closing websocket');
            this.close();
          }, 10000 + 1000);
        } else if (
          typeof data === 'object' &&
          data.updatedBy !== user._id &&
          'action' in data
        ) {
          console.log(`data.action = ${data.action}`);
          if (data.action === ACTION.JOIN) {
            navigate(location.pathname, {
              replace: true,
              state: {
                playersUpdated: data.players,
                gameId: gameId,
              },
            });
            msg = `${
              data.players.find((p: PlayerDetail) => p.userId !== user._id)
                .userName
            } joined game`;
            notify(msg);
          } else if (data.action === ACTION.REENTER) {
            const msg = data.players.find(
              (p: PlayerDetail) => p.userId !== user._id
            ).userName;
            notify(`${msg} re-entered game`);
          } else if (data.action === ACTION.LEAVE) {
            const msg = `${
              data.players.find((p: PlayerDetail) => p.userId !== user._id)
                .userName
            } left game`;
            const updatedPlayers = data.players.filter(
              (p: PlayerDetail) => p.userId !== data.updatedBy
            );
            navigate(location.pathname, {
              replace: true,
              state: {
                playersUpdated: updatedPlayers,
                gameId: gameId,
              },
            });
            notify(msg);
          } else if (data.action === ACTION.REST) {
            const msg = data.players.find(
              (p: PlayerDetail) => p.userId !== user._id
            )?.userName;
            notify(`${msg} taking rest`);
          } else if (data.action === ACTION.MOVE) {
            const name = data.players.find(
              (p: PlayerDetail) => p.userId !== user._id
            ).userName;
            const color = data.players.find(
              (p: PlayerDetail) => p.userId !== user._id
            ).color;
            console.log(`selectedPosId = ${data.selectedPosId}`);
            console.log(`selectedPosIndex = ${data.selectedPosIndex}`);
            updateGameFromOtherPlayer(
              data.selectedPosId,
              data.selectedPosIndex,
              data.status,
              color,
              data.player
            );
            notify(`${name}, made move`);
          }
        } else if (
          typeof data === 'object' &&
          'userId' in data &&
          'message' in data &&
          'userName' in data &&
          data.userId !== user._id &&
          otherPlayer
        ) {
          updateMessages({
            message: data.message,
            userId: otherPlayer.userId,
            userName: otherPlayer.userName,
          });
        }
      } catch (error) {
        if (game && game.isMulti) {
          console.log(
            (state?.playersUpdated || state?.players)?.find(
              (p: PlayerDetail) => p.userId !== user._id
            ).userName +
              ': ' +
              event.data
          );
        } else {
          console.log(error);
        }
      }
    };
    return () => {
      // GameProvider handles closing of ws
      clearInterval(checkInterval);
    };
  }, [
    ws,
    user,
    fetchGameBoard,
    navigate,
    location.pathname,
    // use optional chaining to handle situations when state is null
    state?.players,
    state?.playersUpdated,
    state?.game,
    gameId,
    updateGameFromOtherPlayer,
    game,
    otherPlayer,
    updateMessages,
    setWs,
  ]);

  useEffect(() => {
    if (!hideLeftRightBtns) {
      setShrinkBoard(false);
    }
  }, [hideLeftRightBtns]);

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
    console.log(`entered updateGame`);
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

    const findMe = (state?.playersUpdated || state?.players)?.find(
      (p: PlayerDetail) => p.userId === user?._id
    );

    if (game.isMulti && findMe?.color.toString() !== player.toString()) {
      // abort here if not player's turn
      return;
    }

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
      // setPlayers(players?.filter((p) => p.userId !== user._id));
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const expandBoard = () => {
    setShrinkBoard(false);
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

  const dateInfoString = `created ${
    new Date(game.createdAt).toLocaleString().split(',')[0]
  }`;

  return (
    <>
      <div
        style={{
          maxWidth: `${
            !hideLeftRightBtns && gameBoardAlign !== GAME_BOARD_ALIGN.CENTRE
              ? gameWrapperWidth + 1 + maxChatWrapperWidth
              : !hideLeftRightBtns && gameBoardAlign === GAME_BOARD_ALIGN.CENTRE
              ? maxThresholdWidthGameCentred
              : maxChatWrapperWidth
          }rem`,
        }}
        className={style.container}
      >
        <div
          style={{ paddingTop: `${(headerHeight ?? 100) / 16 + 0.2}rem` }}
          className={`${style['game-wrapper']} ${
            !hideLeftRightBtns && gameBoardAlign === GAME_BOARD_ALIGN.LEFT
              ? ' ' + style['game-wrapper-left']
              : !hideLeftRightBtns && gameBoardAlign === GAME_BOARD_ALIGN.RIGHT
              ? ' ' + style['game-wrapper-right']
              : ''
          }`}
        >
          <div className={style['control-buttons']}>
            {game.status === GAMESTATUS.ACTIVE && (
              <>
                {' '}
                {(state.playersUpdated?.length === 1 ||
                  state.players?.length === 1) && (
                  <button
                    className={style.button}
                    onClick={() => {
                      resetGame();
                    }}
                  >
                    Restart
                  </button>
                )}
                <button
                  className={style.button}
                  onClick={() => {
                    navigate('/', { state: {} });
                  }}
                >
                  Pause
                </button>
              </>
            )}
            <button
              className={style.button}
              onClick={async () => {
                console.log(`location.pathname = ${location.pathname}`);
                if (game.status === GAMESTATUS.ACTIVE) {
                  await leaveGame();
                  navigate('/', { replace: true, state: {} });
                } else {
                  navigate('/games', {
                    replace: true,
                    state: {},
                  });
                }
              }}
            >
              Leave
            </button>
          </div>
          <div className={style['game-title-state-wrapper']}>
            <span
              className={style['game-title']}
            >{`${`game-${game.gameNumber}`} (${rows}x${cols})`}</span>
            <span className={style['game-state-info']}>{dateInfoString}</span>
            <span
              className={`${style['game-state-info']}${
                game.status === GAMESTATUS.WON ? ' ' + style['game-won'] : ''
              }`}
            >
              {gameStateLabel()}
            </span>
          </div>
          {/* {game.status === GAMESTATUS.WON && <ConfettiExplosion />} */}
          <div className={style['board-wrapper-outer']}>
            <div className={style['board-wrapper-inner']}>
              <button
                className={`${style['pushable-lhs']}${
                  hideLeftRightBtns
                    ? ' ' + style['hide-side-btns']
                    : gameBoardAlign === GAME_BOARD_ALIGN.LEFT
                    ? ' ' + style['hide-left-btn']
                    : ''
                }`}
                onClick={() => {
                  if (gameBoardAlign === GAME_BOARD_ALIGN.RIGHT)
                    setGameBoardAlign(GAME_BOARD_ALIGN.CENTRE);
                  else setGameBoardAlign(GAME_BOARD_ALIGN.LEFT);
                }}
              >
                <span className={style['front-lhs']}>&laquo;</span>
              </button>
              <div
                className={`${style.board}${
                  hideLeftRightBtns && shrinkBoard
                    ? ' ' + style['shrink-board']
                    : ''
                }`}
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${
                    hideLeftRightBtns && shrinkBoard
                      ? 0.75
                      : cols > 7 && shrinkBoardPositions
                      ? 2
                      : 3
                  }rem)`,
                }}
                data-bg-text={'TOUCH or CLICK TO CONTINUE'}
                onClick={
                  hideLeftRightBtns && shrinkBoard
                    ? () => expandBoard()
                    : () => null
                }
              >
                {game.positions.map((p, idx) => (
                  <Position
                    cols={cols}
                    shrinkBoardPositions={shrinkBoardPositions}
                    hideLeftRightBtns={hideLeftRightBtns}
                    shrinkBoard={shrinkBoard}
                    key={p._id}
                    id={p._id}
                    posId={idx}
                    positionStatus={p.status}
                    gameStatus={game.status}
                    addSelectedPosition={updateGame}
                    expandBoard={expandBoard}
                    myTurn={
                      (state?.playersUpdated || state?.players)
                        ?.find((p: PlayerDetail) => p.userId === user?._id)
                        .color.toString() === player.toString() || !game.isMulti
                    }
                    updating={updating}
                  />
                ))}
              </div>
              <button
                className={`${style['pushable-rhs']}${
                  hideLeftRightBtns
                    ? ' ' + style['hide-side-btns']
                    : gameBoardAlign === GAME_BOARD_ALIGN.RIGHT
                    ? ' ' + style['hide-right-btn']
                    : ''
                }`}
                onClick={() => {
                  if (gameBoardAlign === GAME_BOARD_ALIGN.LEFT)
                    setGameBoardAlign(GAME_BOARD_ALIGN.CENTRE);
                  else setGameBoardAlign(GAME_BOARD_ALIGN.RIGHT);
                }}
              >
                <span className={style['front-rhs']}>&raquo;</span>
              </button>
            </div>
            {!shrinkBoard && (
              <button
                className={`${style.pushable} ${
                  !hideLeftRightBtns ? ' ' + style['pushable-hide'] : ''
                }`}
                onClick={() => {
                  setShrinkBoard(!shrinkBoard);
                }}
              >
                <div className={style.front}>
                  <span className={style['front-dbl-arrow']}>&laquo;</span>
                  <span className={style['front-dbl-arrow']}>&laquo;</span>
                </div>
              </button>
            )}
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
        <div
          className={`${style['chat-wrapper']}
            ${
              !hideLeftRightBtns && gameBoardAlign === GAME_BOARD_ALIGN.LEFT
                ? ' ' + style['chat-wrapper-right']
                : !hideLeftRightBtns &&
                  gameBoardAlign === GAME_BOARD_ALIGN.RIGHT
                ? ' ' + style['chat-wrapper-left']
                : ''
            }`}
          style={
            !hideLeftRightBtns && gameBoardAlign !== GAME_BOARD_ALIGN.CENTRE
              ? {
                  maxWidth: `${maxChatWrapperWidth}rem`,
                  width:
                    cols < 6
                      ? '60%'
                      : cols < 7
                      ? '58%'
                      : cols < 8
                      ? '55%'
                      : cols < 10
                      ? '50%'
                      : '45%',
                }
              : { maxWidth: `${maxThresholdWidthGameCentred}rem` }
          }
        >
          <Chat ws={ws} messages={messages} updateMessages={updateMessages} />
        </div>
      </div>
      <ToastContainer
        // position="top-center"
        position="top-left"
        // autoClose={false}
        className={style['toast-container']}
        toastClassName={style['toast-wrapper']}
      />
      {game.status === GAMESTATUS.WON && windowIsActive && (
        <Fireworks
          decorateOptions={(defaultOptions) => {
            return {
              ...defaultOptions,
              particleCount: 100,
              shapes: ['square', 'circle', 'star'],
              startVelocity: 47,
              scalar: 1.25,
              decay: 0.88,
              ticks: 230,
            };
          }}
          autorun={{ speed: 0.7 }}
        />
      )}
    </>
  );
}
