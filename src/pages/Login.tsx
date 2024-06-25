import { useState, useContext, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Button, Input, Message } from '../components';
import { UserContext, GameContext } from '../context';

import style from './Login.module.css';
import { CreateGameInfo, GameInfo } from '../types';
import { post } from '../utils/http';
import { API_HOST } from '../constants';

export default function Login() {
  const { state } = useLocation();
  const boardSize = state ? state.boardSize : null;
  const isMulti = state ? state.isMulti : null;
  const { login, user } = useContext(UserContext);
  const usernameInput = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingGame, setLoadingGame] = useState(false);
  const { headerHeight } = useContext(GameContext);

  useEffect(() => {
    if (usernameInput.current) {
      usernameInput.current.focus();
    }
  }, []);

  const newGame = async (b: number[], isMulti: boolean) => {
    // const todaysDate = new Date().toLocaleString().split(',')[0];
    // const inputBody = { size: b, times: { start: todaysDate, end: '' } };
    const inputBody = { size: b, isMulti: isMulti };
    try {
      setLoadingGame(true);
      const game = await post<CreateGameInfo, GameInfo>(
        `${API_HOST}/api/`,
        inputBody
      );
      return game;
    } catch (err: any) {
      setLoadingGame(false);
      return undefined;
    }
  };

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { target } = event;
    if (target.type === 'password') {
      setPassword(target.value);
    } else {
      setUsername(target.value);
    }
    setErrorMessage('');
  }

  const handleLogin = async () => {
    try {
      setErrorMessage('');
      const result = await login(username, password);
      if (result === true) {
        if (!boardSize || !isMulti) {
          navigate('/', { replace: true });
        } else {
          try {
            const createdGame: GameInfo | undefined = await newGame(
              boardSize,
              isMulti
            );
            if (!createdGame) {
              navigate(`/`, { replace: true });
            } else {
              navigate(`/game/${createdGame._id}`, {
                state: { game: createdGame },
                replace: true,
              });
            }
          } catch (e: any) {
            navigate(`/`, { replace: true });
          }
        }
      } else throw new Error(result); // result will be a string here
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  return loadingGame ? (
    <span className={style['loading-game-state']}>Creating game</span>
  ) : user ? (
    <Navigate to="/" replace={true} />
  ) : (
    <form
      className={style.container}
      style={{ top: `${(headerHeight ?? 80) / 16}rem` }}
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
    >
      {errorMessage && <Message variant="error" message={errorMessage} />}
      <Input
        ref={usernameInput}
        name="username"
        placeholder="Username"
        value={username}
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e)}
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e)}
      />
      <Button type="submit" disabled={!username || !password}>
        Login
      </Button>
    </form>
  );
}
