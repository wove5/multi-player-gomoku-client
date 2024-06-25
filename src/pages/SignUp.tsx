import { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Message } from '../components';
import { UserContext, GameContext } from '../context';

import style from './SignUp.module.css';
import { CreateGameInfo, GameInfo } from '../types';
import { post } from '../utils/http';
import { API_HOST } from '../constants';

export default function SignUp() {
  const { state } = useLocation();
  const { boardSize, isMulti } = state;
  const { register } = useContext(UserContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { headerHeight } = useContext(GameContext);

  const newGame = async (b: number[], isMulti: boolean) => {
    // const todaysDate = new Date().toLocaleString().split(',')[0];
    // const inputBody = { size: b, times: { start: todaysDate, end: '' } };
    const inputBody = { size: b, isMulti: isMulti };
    try {
      const game = await post<CreateGameInfo, GameInfo>(
        `${API_HOST}/api/`,
        inputBody
      );
      return game;
    } catch (err: any) {
      return undefined;
    }
  };

  const handleSignUp = async () => {
    setErrorMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    const result = await register(username, password);
    if (result === true) {
      if (!boardSize || !isMulti) {
        navigate('/');
      } else {
        const createdGame: GameInfo | undefined = await newGame(
          boardSize,
          isMulti
        );
        if (!createdGame) {
          navigate('/');
        } else {
          navigate(`/game/${createdGame._id}`, {
            state: { game: createdGame },
            replace: true,
          });
        }
      }
    } else {
      setErrorMessage(result);
    }
  };

  return (
    <form
      className={style.container}
      style={{ top: `${(headerHeight ?? 80) / 16}rem` }}
      onSubmit={(e) => {
        e.preventDefault();
        handleSignUp();
      }}
    >
      {errorMessage && <Message variant="error" message={errorMessage} />}
      <Input
        name="username"
        placeholder="Username"
        value={username}
        onChange={(e) => {
          setErrorMessage('');
          setUsername(e.target.value);
        }}
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setErrorMessage('');
          setPassword(e.target.value);
        }}
      />

      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => {
          setErrorMessage('');
          setConfirmPassword(e.target.value);
        }}
      />
      <Button
        type="submit"
        disabled={!username || !password || !confirmPassword}
      >
        Sign Up
      </Button>
    </form>
  );
}
