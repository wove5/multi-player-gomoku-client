import { Button, Message, SessionExpired } from '../components';
import style from './Home.module.css';
import Select, { ActionMeta, SingleValue, StylesConfig } from 'react-select';
import { UserContext } from '../context';
import { useNavigate } from 'react-router';
import { useContext, useEffect, useState } from 'react';
import boards from '../data/boards.json';
import { get, post, put } from '../utils/http';
import { IncompleteGameData } from '../interfaces';
import { CreateGameInfo, EnterLeaveGame, GameInfo } from '../types';
import { API_HOST, ACTION, GAME_MODE } from '../constants';

const gameModes = [GAME_MODE.SINGLE, GAME_MODE.MULTI];

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useContext(UserContext);

  interface GameOption {
    value: string;
    label: string;
  }
  const [incompleteGameOptions, setIncompleteGameOptions] = useState<
    GameOption[]
  >([]);

  const [selectedGame, setSelectedGame] = useState<SingleValue<GameOption>>({
    value: '',
    label: '',
  });

  const [multiPlayerGameOptions, setMultiPlayerGameOptions] = useState<
    GameOption[]
  >([]);

  const [selectedMultiGame, setSelectedMultiGame] = useState<
    SingleValue<GameOption>
  >({
    value: '',
    label: '',
  });

  const [creatingGame, setCreatingGame] = useState(false);
  const [retrievingGame, setRetrievingGame] = useState(false);
  const [attemptGameCreation, setAttemptGameCreation] = useState(false);
  const [attemptGameRetrieval, setAttemptGameRetrieval] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingActiveGames, setLoadingActiveGames] = useState(false);
  const [tokenExpiredFlag, setTokenExpiredFlag] = useState(false);

  interface BoardOption {
    value: number[];
    label: string;
  }

  const boardOptions: BoardOption[] = boards.map((b) => ({
    value: [b.rows, b.posPerRow],
    label: `${b.rows}x${b.posPerRow}`,
  }));

  const [selectedBoard, setSelectedBoard] = useState<SingleValue<BoardOption>>({
    value: [],
    label: '',
  });

  interface GameModeOption {
    value: GAME_MODE;
    label: string;
  }

  const gameModeOptions: GameModeOption[] = gameModes.map((gm) => ({
    value: gm,
    label: `${gm === GAME_MODE.SINGLE ? 'Single Player' : 'Multi Player'}`,
  }));

  const [selectedGameMode, setSelectedGameMode] = useState<
    SingleValue<GameModeOption>
  >({
    value: GAME_MODE.NONE,
    label: '',
  });

  if (user && !localStorage.user)
    localStorage.setItem('user', JSON.stringify(user));

  type isMulti = false;
  const optionStyle: StylesConfig<GameOption, isMulti> = {
    option: (provided) => ({ ...provided, wordSpacing: '0.8rem' }),
    control: (provided) => ({ ...provided, wordSpacing: '0.2rem' }),
  };

  const newGame = async (b: number[], isMulti: boolean) => {
    const inputBody = { size: b, isMulti: isMulti };
    try {
      setCreatingGame(true);
      setAttemptGameCreation(true);
      const game = await post<CreateGameInfo, GameInfo>(
        `${API_HOST}/api/`,
        inputBody
      );
      setCreatingGame(false);
      setAttemptGameCreation(false);
      return game;
    } catch (err: any) {
      console.log(`user = ${user}`);
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        console.log(`err.message = ${err.message}`);
        logout();
        setTokenExpiredFlag(true);
      }
      console.log(`user = ${user}`);
      setCreatingGame(false);
      return undefined;
    }
  };

  const resumeGame = async (gameId: string) => {
    //TODO: refactor ACTION type of action arg to something better; ACTION.LEAVE is a possible value,and should not be
    try {
      setRetrievingGame(true);
      setAttemptGameRetrieval(true);
      const result = await get<GameInfo>(`${API_HOST}/api/game/${gameId}`);
      setRetrievingGame(false);
      setAttemptGameRetrieval(false);
      return result;
    } catch (err: any) {
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        logout();
        setTokenExpiredFlag(true);
      }
      setRetrievingGame(false);
      return undefined;
    }
  };

  const joinGame = async (gameId: string) => {
    //TODO: refactor ACTION type of action arg to something better; ACTION.LEAVE is a possible value,and should not be
    try {
      setRetrievingGame(true);
      setAttemptGameRetrieval(true);
      const result = await put<EnterLeaveGame, GameInfo>(
        `${API_HOST}/api/game/${gameId}`,
        {
          action: ACTION.JOIN,
        }
      );
      setRetrievingGame(false);
      setAttemptGameRetrieval(false);
      return result;
    } catch (err: any) {
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        logout();
        setTokenExpiredFlag(true);
      }
      setRetrievingGame(false);
      return undefined;
    }
  };

  useEffect(() => {
    const populateDropDownBoxes = async () => {
      if (!user) {
        setIncompleteGameOptions([]);
        setMultiPlayerGameOptions([]);
      } else {
        try {
          setLoadingActiveGames(true);
          const result = await get<IncompleteGameData[]>(`${API_HOST}/api`);
          setIncompleteGameOptions(
            result
              .filter((g) => g.players.map((p) => p.userId).includes(user._id)) //g.players[0].userId === user._id)
              .map((g) => ({
                value: g._id,
                label: `game-${g.gameNumber} (${g.size[0]}x${g.size[1]} ${
                  g.isMulti ? 'multi-player' : 'Single-player'
                }) started: ${
                  new Date(g.createdAt).toLocaleString().split(',')[0]
                } ${
                  g.isMulti && g.players.length > 1
                    ? `(opponent: ${
                        g.users.filter((p) => p.userId !== user._id)[0].username
                      })`
                    : ''
                }`,
              }))
          );
          setMultiPlayerGameOptions(
            result
              .filter(
                (g) =>
                  g.isMulti &&
                  g.players.length === 1 &&
                  g.players[0].userId !== user._id
              )
              .map((g) => ({
                value: g._id,
                label: `game-${g.gameNumber} (${g.size[0]}x${
                  g.size[1]
                } multi-player) started: ${
                  new Date(g.createdAt).toLocaleString().split(',')[0]
                } (opponent: ${g.users[0].username})`,
              }))
          );
          setLoadingActiveGames(false);
        } catch (err: any) {
          setLoadingActiveGames(false);
          setIncompleteGameOptions([]);
          if (
            err.message === 'Invalid token' ||
            err.message === 'Token missing' ||
            err.message === 'Invalid user'
          ) {
            logout();
            setTokenExpiredFlag(true);
          } else {
            setErrorMessage(
              'Cannot retrieve games - server or network problem. Try again later'
            );
          }
        }
      }
    };

    populateDropDownBoxes();
  }, [user, logout]);

  if (tokenExpiredFlag) {
    return <SessionExpired styleName={style.expired} />;
  }

  return creatingGame ? (
    <span className={style['loading-game-state']}>Creating game</span>
  ) : retrievingGame ? (
    <span className={style['loading-game-state']}>Retrieving game</span>
  ) : (
    <div className={style.container}>
      <div className={style['inner-container']}>
        <Button
          type="submit"
          onClick={async (e) => {
            if (
              !selectedBoard || // check for null to avoid value could be null
              !selectedGameMode || // warning when assigning from or referencing properties
              selectedBoard.value.length === 0 ||
              selectedBoard.label === '' ||
              selectedGameMode.value === GAME_MODE.NONE ||
              selectedGameMode.label === ''
            ) {
              e.preventDefault();
            } else if (!user) {
              navigate(`/login`, {
                state: {
                  boardSize: selectedBoard.value,
                  isMulti:
                    selectedGameMode.value === GAME_MODE.MULTI ? true : false,
                },
              });
            } else {
              const createdGame: GameInfo | undefined = await newGame(
                selectedBoard.value,
                selectedGameMode.value === GAME_MODE.MULTI ? true : false
              );
              if (createdGame) {
                navigate(`/game/${createdGame._id}`, {
                  state: { game: createdGame },
                });
              }
            }
          }}
        >
          Start new game
        </Button>
        <div className={style['interim-container1']}>
          <Select
            className={style['board-size-game-mode']}
            options={boardOptions}
            placeholder="Board size"
            onChange={(
              newValue: SingleValue<{ value: number[]; label: string }>,
              actionMeta: ActionMeta<{ value: number[]; label: string }>
            ) => {
              setErrorMessage('');
              setAttemptGameCreation(false);
              setAttemptGameRetrieval(false);
              setSelectedBoard(newValue);
            }}
          />
          <Select
            className={style['board-size-game-mode']}
            options={gameModeOptions}
            placeholder="Game mode"
            onChange={(
              newValue: SingleValue<{ value: GAME_MODE; label: string }>,
              actionMeta: ActionMeta<{ value: GAME_MODE; label: string }>
            ) => {
              setErrorMessage('');
              setAttemptGameCreation(false);
              setAttemptGameRetrieval(false);
              setSelectedGameMode(newValue);
            }}
          />
        </div>
        {attemptGameCreation && user && (
          <span className={style['loading-game-result']}>
            Failed to create game - server or network problem. Try again later
          </span>
        )}
      </div>
      {loadingActiveGames === true ? (
        <span className={style['loading-game-state']}>
          Finding active games
        </span>
      ) : (
        <div className={style['interim-container2']}>
          {incompleteGameOptions.length > 0 && (
            <div className={style['inner-container']}>
              <Button
                type="submit"
                onClick={async (e) => {
                  if (!selectedGame || selectedGame.value === '') {
                    e.preventDefault();
                  } else {
                    // navigate(`/game/${selectedGame.value}`); // not using
                    // get game in Home page, then pass to Game page
                    const retrievedGame: GameInfo | undefined =
                      await resumeGame(selectedGame.value);
                    if (retrievedGame) {
                      // FYI: initial idea was for GameProvider to maintain player/user details
                      // for subsequent display in header with data passed from Game component.
                      // This changing of state in GameProvider was to occur during Game rendered,
                      // however, it is not possible to update the state/ enqueue state updates
                      // of other components from a component while it is rendering - these kind
                      // of updates can only be done within an event handler of a component.
                      // The first alternative idea was then to make the necessary update to
                      // GameProvider from here via the click event to achieve the desired effect
                      // of Header displaying the correct Users/Players details whenever Game
                      // page component is loaded. This worked for page navigation, however,
                      // page refreshing and direct navigation would loose the Users/Players info
                      // displayed in the Header.
                      // The third and successful idea was to rely on the Users/Players details
                      // inside the game object, already being retrieved here and passed via
                      // react-router's location.state container onto the Game component. It turns
                      // out the location.state is also accessible to the Header component which
                      // is displayed at the top of the Game page, as well as every other page.
                      // TODO: This long commentary to be moved to a wiki page "design ideas" of the gh repo

                      navigate(`/game/${retrievedGame._id}`, {
                        state: {
                          game: retrievedGame,
                          players: retrievedGame.players,
                        },
                      });
                    }
                  }
                }}
              >
                Resume incomplete game
              </Button>
              <Select
                styles={optionStyle}
                options={incompleteGameOptions}
                placeholder="Select a game"
                onChange={(
                  newValue: SingleValue<GameOption>,
                  actionMeta: ActionMeta<GameOption>
                ) => {
                  setAttemptGameCreation(false);
                  setAttemptGameRetrieval(false);
                  setErrorMessage('');
                  console.log(`Change event; newValue= ${newValue?.value}`);
                  setSelectedGame(newValue);
                }}
              />
            </div>
          )}
          {multiPlayerGameOptions.length > 0 && (
            <div className={style['inner-container']}>
              <Button
                type="submit"
                onClick={async (e) => {
                  if (!selectedMultiGame || selectedMultiGame.value === '') {
                    e.preventDefault();
                  } else {
                    // navigate(`/game/${selectedGame.value}`);
                    // alternatively - get game in Home page, then pass to Game page
                    console.log(`submitting: ${selectedMultiGame.value}`);
                    const retrievedGame: GameInfo | undefined = await joinGame(
                      selectedMultiGame.value
                    );
                    if (retrievedGame) {
                      navigate(`/game/${retrievedGame._id}`, {
                        state: {
                          game: retrievedGame,
                          players: retrievedGame.players,
                        },
                      });
                    }
                  }
                }}
              >
                Join another game
              </Button>
              <Select
                styles={optionStyle}
                options={multiPlayerGameOptions}
                placeholder="Select a game"
                onChange={(
                  newValue: SingleValue<GameOption>,
                  actionMeta: ActionMeta<GameOption>
                ) => {
                  setAttemptGameCreation(false);
                  setAttemptGameRetrieval(false);
                  setErrorMessage('');
                  console.log(`Change event; newValue= ${newValue?.value}`);
                  setSelectedMultiGame(newValue);
                }}
              />
            </div>
          )}
          {attemptGameRetrieval && user && (
            <span className={style['loading-game-result']}>
              Failed to retrieve game - server or network problem. Try again
              later
            </span>
          )}
        </div>
      )}
      {errorMessage && (
        <div className={style['error-message']}>
          {<Message variant="error" message={errorMessage} />}
        </div>
      )}
    </div>
  );
}
