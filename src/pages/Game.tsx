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
  const { previousPath, me, otherPlayer, setWs, headerHeight, windowIsActive } =
    useContext(GameContext);

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
  const [messages, setMessages] = useState<Array<Message>>(
    state === null || state === undefined || state.game === undefined
      ? []
      : () => {
        return state.game.messages;
      }
  );

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
          const currentPlayers = state.game.players;
          const isMulti = state.game.isMulti;
          if (lastSelectedPositionNumber.length === 0) { // lastSelectedPositionNumber is array
            return !isMulti ? PLAYER.BLACK  // single player game
            // otherwise, give the next move to player who was in the game first
            : currentPlayers[0].color === POSITION_STATUS.BLACK
            ? PLAYER.BLACK
            : PLAYER.WHITE;
          } else {
            return currentBoardPositions[lastSelectedPositionNumber[0]].status ===
              POSITION_STATUS.BLACK
            ? PLAYER.WHITE
            : PLAYER.BLACK;
          }
        }
  );

  const [loading, setLoading] = useState(true);
  const [loadingResultDetermined, setLoadingResultDetermined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchGameBoard = useCallback(async () => {
    console.log(`fetchGameBoard - now trying an API call to fetch game`);
    try {
      const incompleteGames = await get<IncompleteGameData[]>(
        `${API_HOST}/api`
      );
      // *********** NO!, it is used - (subsequent reflection) 
      // completedGame/s is not used; not sure why it was here? If a player 
      // has not completed any games and refreshes the page for a game they
      // are currently playing, the api req. will return 404 Not Found error
      // as per design which gets caught here and results in a blank page.
      // **  The reason was so that a page reload on a completed game will work.
      const completedGames = await get<CompletedGameData[]>(
        `${API_HOST}/api/games`
      );
      const completedGame = completedGames.find((g) => g._id === gameId);
      // The game may have just been completed, ie, WON or DRAWN; if so, find
      // that game and assign it. Then further below, a result is assigned from
      // either an "incompleteGame" or a "completedGame"
      const incompleteGame = incompleteGames.find((g) => g._id === gameId);
      if (!completedGame && !incompleteGame) {
      // if (!incompleteGame) {
        setLoading(false);
        setLoadingResultDetermined(true);
        return;
      }
      // this appears related to the above-mentioned mistaken use of completedGame/s?
      // (It was never a mistake - it was intentional)
      const result = incompleteGame
        ? await get<GameInfo>(`${API_HOST}/api/game/${gameId}`)
        : await get<GameInfo>(`${API_HOST}/api/game-log/${gameId}`);
      // perhaps the original idea was to have a multi-purpose game component
      // to cover both Game and GameLog pages?
      // NO!. The reason as added above is to allow for a page refresh to work
      // if reloading a game page with game that has just been completed.
      // const result = await get<GameInfo>(`${API_HOST}/api/game/${gameId}`);
      setGame(result);
      setLoading(false);
      // this causes a momentary display of "Game Not Found"
      // setLoadingResultDetermined(true); // only useful on game retrieval finding no game
      const currentBoardPositions = result.positions;
      const selectedPositionNumbers = result.selectedPositions;
      const lastSelectedPositionNumber = selectedPositionNumbers.slice(-1);
      setPlayer(
        lastSelectedPositionNumber.length === 0
          ? () => {
            return !result.isMulti ? PLAYER.BLACK  // single player game
            // otherwise, give the next move to player who was in the game first
            : result.players[0].color === POSITION_STATUS.BLACK
            ? PLAYER.BLACK
            : PLAYER.WHITE;
          }
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
      setMessages(result.messages);
      navigate(location.pathname, {
        replace: true,
        state: { playersUpdated: result.players, gameId },
      });
      console.log(`game successfully retrieved from API`);
    } catch (err: any) {
      console.log('This is in fetchGameBoard')
      console.log(`err.message = ${err.message}`);
      console.log(`err.status = ${err.status}`);
      console.log(`err = ${err}`);
      console.table(err);
      // initially, the page momentarily renders, calls the API, then quickly starts over again.
      // the first time round, loading is left as true so that loading progess msg is maintained
      if (err.message !== 'NetworkError when attempting to fetch resource.') {
        setLoading(false) // all other times, this is treated as a genuine failed req. and loading
      }                   // progress msg is skipped and falls through to final Game not found msg
      setGame(undefined);
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        console.log(`calling logout(), which in turn calls setUser(undefined),
           which then triggers a rerender of Game page which renders a SessionExpired
           page down below.`)
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

  const updateMessages = useCallback(async (msg: Message) => {

    const originalMessages = messages

    try {
      setErrorMessage('');

      // functional update ensures messages is not referenced directly and does not trigger rerenders.
      setMessages((messages) => [
        ...messages,
        {
          message: msg.message,
          userId: msg.userId,
          userName: msg.userName,
        },
      ]);

      // update in db only if msg is being sent by this user
      if (msg.userId === user?._id) {
        // const result = await put<UpdateGame, Messages>( // tbc - server returning chat
        await put<UpdateGame, {}>(
          `${API_HOST}/api/game/${gameId}`,
          {
            msg
          }
        );
      }
      // an incoming msg from other user will not trigger above api call
      // and therefore updateMessages should complete with no issues

      // consider having a payload of messages in res. from the server & storing it in game?
      // setGame({
      //   ...game,
      //   messages: result.messages
      // });
      return { success: true};
    } catch (err: any) {
      // this area is for handing a failed db update on msg send only
      // incoming msg from other player should not generate an error & enter catch block.

      // if database update failed, restore messages array to orig. by removing msg:
      setMessages(originalMessages);

      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        setErrorMessage(err.message);
        logout();
      }
      setErrorMessage(
        `Message not sent. Something went wrong. Server &/ or database
        is non-responsive`
      );
      return { success: false };
    }

  }, [gameId, logout, messages, user?._id]);

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
  //     gameId,
  //     updateGameFromOtherPlayer,
  //     state.playersUpdated,
  //     game,
  //     otherPlayer,
  //     updateMessages,
  //     setWs,
  //     state,
  //   ],
  //   'ws, user, fetchGameBoard, navigate, location.pathname, state.players, state.game, gameId, updateGameFromOtherPlayer, state.playersUpdated, game, otherPlayer, updateMessages, setWs, state'
  // );

  let lastPingTime: React.MutableRefObject<number> = useRef(Date.now());
  let updating: React.MutableRefObject<boolean> = useRef(false);
  let resetting: React.MutableRefObject<boolean> = useRef(false);

  //TODO: keep an ongoing eye out for TypeError "Cannot read properties of undefined (reading 'find')"... error occurred once on mobile
  //TODO: during testing but was not able to be replicated or narrowed down to the particular array.find() method in this file.
  //TODO: In an attempt to prevent error reappearing, conditional chaining has been added to the 3 suspected instances of the find method as in:
  //TODO: (state?.playersUpdated || state?.players)?.find(...

  useEffect(() => {
    console.log('Entered Game useEffect');
    // console.log(`state = ${state}`);
    // console.log(`state.game = ${state.game}`);
    // console.log(`state.playersUpdated = ${state?.playersUpdated}`);
    // console.log(`game = ${game}`);
    // console.log(`ws = ${ws}`);
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
      // when page is rerendered/reloaded, state is undefined & setGame makes game undefined also.
      // Therefore, anything derived from state that is used in useEffect may need to be conditionally
      // chained when used with accessing properties; eg: state?.playersUpdated, me?.color
    } else if (!game) {
      fetchGameBoard(); // this fnc performs navigate inserting playersUpdated into state,
                        // therefore, playersUpated should be immediately available after this;
                        // it is at least established before me & otherPlayer are, hence condition chaining is
                        // mandatory for me & otherPlayer or else errors result. conditional chaining for
                        // playersUpdate can be omitted it seems from testing, but probably safer to incl. it?
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
      // destroy the old one if it does still exists (it likely doesn't exist).
      // In the case that server dropped the connection because of token expiration,
      // the page reload runs fetchGameBoard(), which fails because of an Invalid token,
      // and then calls logout() from userProvider, which in turn calls setUser(undefined)
      // which triggers another rerender of Game page and this time the SessionExpired page
      // is rendered which redirects to the home page.
      // the console.log before window.location.reload cannot be seen in realtime 
      // due to speed of rerender unless execution is deliberately paused with a break
      // point at window.location.reload, or inside ws.onclose.
      if (
        Date.now() - lastPingTime.current >
        11000
        // && ws.readyState !== CustomWebSocket.OPEN // tbc, but should not be necessary
      ) {
        console.log('Game Page Reloading Window')
        window.location.reload();
        console.log('Game Page has Reloaded Window')
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
      // The console.log in the callback defined in the pingTimeout property above wont
      // show because pingTimeout is removed from the websocket in ws.onclose before it
      // gets a chance to run - same comment below where this.pingTimeout is updated
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
      clearTimeout(this.pingTimeout); // pingTimeout gets removed & the cb is not executed
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
            // The console.log in the callback defined in the pingTimeout property below wont
            // show because pingTimeout is removed from the websocket in ws.onclose 
            // before the cb gets a chance to run, though it can be seen at runtime by commenting 
            // out the call to clearTimeout in ws.close
            // - can also do alert('ping timeout occurred; ....' to make the cb execution obvious
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
              data.players.find((p: PlayerDetail) => p.user._id !== user._id).user
                .userName
            } joined game`;
            notify(msg);
          } else if (data.action === ACTION.REENTER) {
            const msg = data.players.find(
              (p: PlayerDetail) => p.user._id !== user._id
            ).user.userName;
            notify(`${msg} re-entered game`);
          } else if (data.action === ACTION.LEAVE) {
            const msg = `${
              data.players.find((p: PlayerDetail) => p.user._id !== user._id).user
                .userName
            } left game`;
            const updatedPlayers = data.players.filter(
              (p: PlayerDetail) => p.user._id !== data.updatedBy
            );
            navigate(location.pathname, {
              replace: true,
              state: {
                playersUpdated: updatedPlayers,
                gameId: gameId,
              },
            });
            notify(msg);
            if (game?.selectedPositions.length === 0) {
              setPlayer(
                // !game.isMulti ? PLAYER.BLACK  // N/A: single player leaves: no opponent to be notified 
                // // next move will go to player remaining in game
                // // as explain above, playersUpated is available before me & otherPlayer are.
                // // me & otherPlayer are derived from playersUpdated eventually.
                // // Thus, using playersUpdated to access player info is more direct & reliable.
                // // Condition chaining is mandatory for me & otherPlayer or else errors result.
                // // conditional chaining for playersUpdated can be omitted it seems from testing,
                // // seems ok for me.color too, but in dependencies it needs conditional chaining
                // me.color === POSITION_STATUS.BLACK // is it safer to conditional chain here?
                // game.players.find(p => p.user._id === user._id)?.color === POSITION_STATUS.BLACK
                // // game.players also works, but like me & otherPlayer, game is updated some
                // // time later than playersUpdated, so decision is to stick with state.playersUpdated.
                // // Am comfortable omitting conditional chaining because playersUpdated is assigned
                // // beforehand in the navgiate/ replace mechanism.
                state.playersUpdated.find((p: PlayerDetail) => p.user._id === user._id)?.color === POSITION_STATUS.BLACK
                ? PLAYER.BLACK
                : PLAYER.WHITE
              );
            }
          } else if (data.action === ACTION.REST) {
            const msg = data.players.find(
              (p: PlayerDetail) => p.user._id !== user._id
            ).user.userName;
            notify(`${msg} taking rest`);
          } else if (data.action === ACTION.MOVE) {
            const name = data.players.find(
              (p: PlayerDetail) => p.user._id !== user._id
            ).user.userName;
            const color = data.players.find(
              (p: PlayerDetail) => p.user._id !== user._id
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
            userId: otherPlayer.user._id,
            userName: otherPlayer.user.userName,
          });
        }
      } catch (error) {
        if (game && game.isMulti) {
          console.log(
            (state?.playersUpdated || state?.players)?.find(
              (p: PlayerDetail) => p.user._id !== user._id
            ).user.userName +
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
    state, // state on its own seems work fine as described below for me.
    // using optional chaining to handle situations when state is null
    // state?.players,
    // state?.playersUpdated,
    // state?.game,
    // me,  
    // me on its own seems to avoid the runtime TypeError: can't access property color, me is undefined
    // me?.color, // otherwise it needs to be conditionally chained
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

  // useEffect(() => {
  //   console.log('useEffect for setting updating.current = false')
  //   updating.current = false
  //   console.log(`updating.current = ${updating.current}`);
  // }, [game])

  if (!user) {
    console.log('No user. rendering a SessionExpired page');
    return <SessionExpired styleName={style['loading-result']} />;
  }

  if (!gameId) {
    return (
      <PageNotFound previousPath={previousPath} message="Page not found" />
    );
  }

  if (!game) {
    // this will only be entered for a page reload or direct nav. 
    // Coming from Home page with a selected game results in game already being set.
    if (loading) {
      return (
        <span 
          className={style['loading-state']}
          style={{ paddingTop: `${(headerHeight ?? 100) / 10 + 0.5}rem` }}
        >
          Retrieving game
        </span>
      );
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
    if (resetting.current === true) {
      return;
    }
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
      // this is probably what should be done
      setGame({
        ...game,
        positions: originalPositions,
        selectedPositions: originalSelectedPositions,
      });
      // this will be the 1st update state put into queue, so game state should be latest
      // but for good practice, could/should wrap the above into a updater function.

      // const newPositions = originalPositions.map((p) => {
      //   return p._id === id
      //     ? {
      //         ...p,
      //         status:
      //           player === PLAYER.BLACK
      //             ? POSITION_STATUS.BLACK
      //             : POSITION_STATUS.WHITE,
      //       }
      //     : p;
      // });
      // const newSelectedPositions = [...originalSelectedPositions, posId];

      // setGame({
      //   ...game,
      //   positions: newPositions,
      //   selectedPositions: newSelectedPositions,
      // });
    }

    // const findMe = (state?.playersUpdated || state?.players)?.find(
    //   (p: PlayerDetail) => p.user._id === user?._id
    // );

    // if ((game.isMulti && findMe?.color.toString() !== player.toString()) || updating) {
    //   // abort here if not player's turn
    //   return;
    // }

    setErrorMessage('');
    // carry out the selection operation and try making all the necessary updates in the database
    updating.current = true
    console.log(`in updateGame. updating.current = ${updating.current}`);
    // const newPositions = game.positions.map((p) => {
    //   return p._id === id
    //     ? {
    //         ...p,
    //         status:
    //           player === PLAYER.BLACK
    //             ? POSITION_STATUS.BLACK
    //             : POSITION_STATUS.WHITE,
    //       }
    //     : p;
    // });
    // const newSelectedPositions = [...game.selectedPositions, posId];
    // // set positions & selectedPositions ahead of the api call to make it appear more responsive
    // setGame({
    //   ...game,
    //   positions: newPositions,
    //   selectedPositions: newSelectedPositions,
    // });

    // // this is probably what should be done
    const originalPlayer = player;
    let originalGame = { ...game }; // make a copy of the game as it was before mutation by a move update
                                    // seems to need assigning here because in catch block it is possibly undefined
    setGame(game => { // using updater function in case that first part of updateGame undid a failed db update
      if (game === undefined) return; // some type guarding to protect updater function - should not occur anyway
                                      // javascript implicitly returns undefined if returning no value
                                      // so if game is undefined, it stays undefined.
      originalGame = { ...game } // make a copy of the game again to take into account any reverted failed db update
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
      return (
        { 
          ...game,  // game is either the original, or original from revert of failed db update
          positions: newPositions,
          selectedPositions: newSelectedPositions,
        }
      )
    })

    try {
      // update game in db
      const result = await put<UpdateGame, GameStatus>(
        `${API_HOST}/api/game/${gameId}`,
        {
          id: id,
        }
      );
      // setGame({
      //   ...game,
      //   status: result.status, // status is the one that needs updating, but
      //   positions: newPositions, // need to set positions & selectedPositions again
      //   selectedPositions: newSelectedPositions, // otherwise ...game will overwrite them with their original values
      // });
      setGame(game => {
        if (game === undefined) return;
        return (
          {
            ...game, // with updater fnc., game has latest changes from prev batched state update, i.e. the move
            status: result.status,
          }
        )
      });

      console.log(game);
      // set the player to whatever the server sends back
      setPlayer(result.player);
      updating.current = false;
    } catch (err: any) {
      // for any failed database updates
      // carry out the following selection operation
      // trying replacement of game with originalGame because game could be the one
      // from a failed db update prior to this failed update, and a yellow position
      // should be rendered onto a clean, original board state, not with other failed
      // update attempts; original board state is that which is consistent with copy in db.
      // const newPositions = game.positions.map((p) => {
      const newPositions = originalGame.positions.map((p) => {
        return p._id === id ? { ...p, status: POSITION_STATUS.YELLOW } : p;
      });
      // const newSelectedPositions = [...game.selectedPositions, posId];
      const newSelectedPositions = [...originalGame.selectedPositions, posId];
      setGame({  // an updater function should not be necessary here
        // ...game,
        ...originalGame,
        positions: newPositions,
        selectedPositions: newSelectedPositions,
      });
      setPlayer(originalPlayer);  // need to monitor this to see if it is right.
                                  // might be ok to leave out?
      updating.current = false;
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        setErrorMessage(err.message);
        console.log('This is in updateGame')
        console.log(`calling logout(), which in turn calls setUser(undefined),
          then triggers rerender of Game page`)
        logout();
      }
      setErrorMessage(
        `Something went wrong. Your selected position is not confirmed yet
         and is marked in yellow for now, which means it may, or may not
         have been updated in the database. You can try selecting it again,
         and if this error reappears, then refresh the page.`
      );
    }
  };

  const resetGame = async () => {
    if (game.selectedPositions.length === 0) {
      return;
    }
    if (updating.current === true) {
      return;
    }
    const originalGame = { ...game }
    const originalPlayer = player;
    try {
      setErrorMessage('');
      
      // updating.current = true;
      resetting.current = true;
      console.log(`in resetGame. updating.current = ${updating.current}`);
      const newPositions = game.positions.map((p) => {
        return { ...p, status: POSITION_STATUS.NONE };
      });
      setGame({  // an updater function should not be necessary here
        ...game,
        positions: newPositions,
        selectedPositions: [],
      });
      // // setPlayer either here or ...     
      // setPlayer(
      //   !game.isMulti ? PLAYER.BLACK // single player game
      //   // otherwise, can only be one player in game, so hand next move to them 
      //   : me.color === POSITION_STATUS.BLACK
      //   ? PLAYER.BLACK
      //   : PLAYER.WHITE
      // );

      const result = await put<ResetGame, GameInfo>(
        `${API_HOST}/api/game/${gameId}`,
        {
          status: POSITION_STATUS.NONE,
        }
      );
      setGame(result);
      console.log(game.selectedPositions);
      // // or set Player here??
      setPlayer(
        !game.isMulti ? PLAYER.BLACK // single player game
        // otherwise, can only be one player in game, so hand next move to them 
        : me.color === POSITION_STATUS.BLACK
        ? PLAYER.BLACK
        : PLAYER.WHITE
      );
      resetting.current = false;
    } catch (err: any) {
      setGame(originalGame); // this will be set back to the original, unmodified game
      setPlayer(originalPlayer);
      // updating.current = false;
      resetting.current = false;
      setErrorMessage(err.message);
    }
  };

  const leaveGame = async () => {
    try {
      setErrorMessage('');
      await put<EnterLeaveGame, {}>(
        `${API_HOST}/api/game/${gameId}`,
        {
          action: ACTION.LEAVE,
        }
      );
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

  // Note; to reiterate explanations about need for conditional chaining - as elaborated on in useEffect,
  // because useEffect setup runs only after render or rerender/reload of page. Consider that on initial
  // render, useEffect setup runs subsequent to the render, and thus state.playersUpdated and me which is
  // derived from state.playersUpdated are undefined and thus conditional chaining is needed to access
  // properties from playersUpdated or me inside the return component below - further investigation as
  // written below shows that location.state is not even available at initial render.
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
                {(state?.playersUpdated?.length === 1 ||
                  state?.players?.length === 1) && (
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
                    isLastMove={p._id === game.positions[game.selectedPositions.slice(-1)[0]]?._id}
                    gameStatus={game.status}
                    addSelectedPosition={updateGame}
                    expandBoard={expandBoard}
                    myTurn={
                      // after create new game when not logged on, me is undefined on nav to the new game page
                      (player.toString() === me?.color.toString() && !updating.current && !resetting.current) 
                       || (!game.isMulti && !updating.current && !resetting.current)      // therefore, conditionally chain
                      // this works too:
                      // (player.toString() ===
                      //  state.playersUpdated?.find((p: PlayerDetail) => p.user._id === user._id).color.toString()
                      //   && !updating )
                      // one might think the following line would work as is without conditional chaining
                      //  state.players.find((p: PlayerDetail) => p.user._id === user._id).color.toString()
                      // It does not work. It appears initial render precedes establishment of compoonent
                      // state, and in particulart the state from Location.Provider, i.e. location.state                      
                    }
                    updating={updating.current}
                    resetting={resetting.current}
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
          {updating.current && (
            <span className={style['loading-state']}>updating game</span>
          )}
          {resetting.current && (
            <span className={style['loading-state']}>resetting game</span>
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
