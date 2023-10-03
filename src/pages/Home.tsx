import { Button, Message, SessionExpired } from '../components';
import style from './Home.module.css';
import Select, { ActionMeta, SingleValue, StylesConfig } from 'react-select';
import { UserContext } from '../context';
import { useNavigate } from 'react-router';
import { useContext, useEffect, useState } from 'react';
import boards from '../data/boards.json';
import { get, post, put } from '../utils/http';
import { IncompleteGameData } from '../interfaces';
import { CreateGameInfo, GameInfo, JoinGame } from '../types';
import { API_HOST, ACTION } from '../constants';

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

  if (user && !localStorage.user)
    localStorage.setItem('user', JSON.stringify(user));

  type isMulti = false;
  const optionStyle: StylesConfig<GameOption, isMulti> = {
    option: (provided) => ({ ...provided, wordSpacing: '0.8rem' }),
    control: (provided) => ({ ...provided, wordSpacing: '0.2rem' }),
  };

  const newGame = async (b: number[]) => {
    const inputBody = { size: b };
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

  const retrieveGame = async (gameId: string, action: ACTION) => {
    try {
      setRetrievingGame(true);
      setAttemptGameRetrieval(true);
      const game =
        action === ACTION.RESUME
          ? await get<GameInfo>(`${API_HOST}/api/game/${gameId}`)
          : await put<JoinGame, GameInfo>(`${API_HOST}/api/game/${gameId}`, {
              action: action,
            });
      setRetrievingGame(false);
      setAttemptGameRetrieval(false);
      return game;
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
            if (!selectedBoard || selectedBoard.label === '') {
              e.preventDefault();
            } else if (!user) {
              navigate(`/login`, {
                state: { boardSize: selectedBoard.value },
              });
            } else {
              const createdGame: GameInfo | undefined = await newGame(
                selectedBoard.value
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
        <Select
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
        <div className={style['interim-container']}>
          {incompleteGameOptions.length > 0 && (
            <div className={style['inner-container']}>
              <Button
                type="submit"
                onClick={async (e) => {
                  if (!selectedGame || selectedGame.value === '') {
                    e.preventDefault();
                  } else {
                    // navigate(`/game/${selectedGame.value}`);
                    // alternatively - get game in Home page, then pass to Game page
                    const gameRetrieved: GameInfo | undefined =
                      await retrieveGame(selectedGame.value, ACTION.RESUME);
                    console.log(`gameRetrieved = ${gameRetrieved}`);
                    if (gameRetrieved) {
                      navigate(`/game/${gameRetrieved._id}`, {
                        state: { game: gameRetrieved },
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
                    const gameRetrieved: GameInfo | undefined =
                      await retrieveGame(selectedMultiGame.value, ACTION.JOIN);
                    if (gameRetrieved) {
                      navigate(`/game/${gameRetrieved._id}`, {
                        state: { game: gameRetrieved },
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
