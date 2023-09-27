import { Button, Message, SessionExpired } from '../components';
import style from './Home.module.css';
import Select, { ActionMeta, SingleValue, StylesConfig } from 'react-select';
import { UserContext } from '../context';
import { useNavigate } from 'react-router';
import { useContext, useEffect, useState } from 'react';
import boards from '../data/boards.json';
import { get, post } from '../utils/http';
import { IncompleteGameData } from '../interfaces';
import { CreateGameInfo, GameInfo } from '../types';
import { API_HOST } from '../constants';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useContext(UserContext);

  interface GameOption {
    value: string;
    label: string;
  }
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);

  const [selectedGame, setSelectedGame] = useState<SingleValue<GameOption>>({
    value: '',
    label: '',
  });

  const [loadingGame, setLoadingGame] = useState(false);
  const [attemptGameLoad, setAttemptGameLoad] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingActiveGames, setLoadingActiveGames] = useState(false);

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
      setLoadingGame(true);
      setAttemptGameLoad(true);
      const game = await post<CreateGameInfo, GameInfo>(
        `${API_HOST}/api/`,
        inputBody
      );
      setLoadingGame(false);
      setAttemptGameLoad(false);
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
      }
      console.log(`user = ${user}`);
      setLoadingGame(false);
      return undefined;
    }
  };

  useEffect(() => {
    const populateIncompleteGamesDropDownBox = async () => {
      if (!user) {
        setGameOptions([]);
      } else {
        try {
          setLoadingActiveGames(true);
          const result = await get<IncompleteGameData[]>(`${API_HOST}/api`);
          setGameOptions(
            result.map((g) => ({
              value: g._id,
              label: `game-${g.gameNumber} (${g.size[0]}x${
                g.size[1]
              }) started: ${
                new Date(g.createdAt).toLocaleString().split(',')[0]
              }`,
            }))
          );
          setLoadingActiveGames(false);
        } catch (err: any) {
          setLoadingActiveGames(false);
          setGameOptions([]);
          if (
            err.message === 'Invalid token' ||
            err.message === 'Token missing' ||
            err.message === 'Invalid user'
          ) {
            logout();
          } else {
            setErrorMessage(
              'Cannot retrieve games - server or network problem. Try again later'
            );
          }
        }
      }
    };
    populateIncompleteGamesDropDownBox();
  }, [user, logout]);

  if (!user) {
    return <SessionExpired styleName={style.expired} />;
  }

  return loadingGame ? (
    <span className={style['loading-game-state']}>Creating game</span>
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
            setAttemptGameLoad(false);
            setSelectedBoard(newValue);
          }}
        />
        {attemptGameLoad && user && (
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
        gameOptions.length > 0 && (
          <div className={style['inner-container']}>
            <Button
              type="submit"
              onClick={(e) => {
                if (!selectedGame || selectedGame.value === '') {
                  e.preventDefault();
                } else {
                  navigate(`/game/${selectedGame.value}`);
                }
              }}
            >
              Resume incomplete game
            </Button>
            <Select
              styles={optionStyle}
              options={gameOptions}
              placeholder="Select a game"
              onChange={(
                newValue: SingleValue<GameOption>,
                actionMeta: ActionMeta<GameOption>
              ) => {
                setAttemptGameLoad(false);
                setErrorMessage('');
                setSelectedGame(newValue);
              }}
            />
          </div>
        )
      )}
      {errorMessage && (
        <div className={style['error-message']}>
          {<Message variant="error" message={errorMessage} />}
        </div>
      )}
    </div>
  );
}
