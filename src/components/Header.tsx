import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext, GameContext } from '../context';

import style from './Header.module.css';
import { POSITION_STATUS } from '../constants';
import { PlayerDetail } from '../types';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, username, logout } = useContext(UserContext);
  const { restFromGame } = useContext(GameContext);

  // location.state supplied by either Home page component or Game component page as needed
  const state = location.state;

  const getActions = () => {
    if (user) {
      return (
        <>
          <button className={style.action} onClick={() => navigate('games')}>
            Previous Games
          </button>
          <button
            className={style.action}
            onClick={() => {
              if (state && state.gameId) {
                restFromGame(state.gameId).then(() => {
                  logout();
                  navigate('/', { replace: true, state: {} });
                });
              } else {
                logout();
                navigate('/');
              }
            }}
          >
            Logout
          </button>
        </>
      );
    } else {
      return location.pathname !== '/login' ? (
        <button
          className={style.action}
          onClick={() =>
            navigate('login', {
              state: { boardSize: null },
            })
          }
        >
          Login
        </button>
      ) : (
        <button
          className={style.action}
          onClick={() =>
            navigate('sign-up', {
              state: { boardSize: null },
            })
          }
        >
          Sign Up
        </button>
      );
    }
  };

  const getClassName = (playerColor: POSITION_STATUS | undefined) => {
    switch (true) {
      case playerColor === POSITION_STATUS.BLACK:
        return style.black;
      case playerColor === POSITION_STATUS.WHITE:
        return style.white;
      default:
        return style.username;
    }
  };

  return (
    <header className={style.header}>
      <div className={style.container}>
        <Link className={style.link} to="/">
          Gomoku
        </Link>
        <div className={style['actions-user-detail']}>
          <div className={style.actions}>{getActions()}</div>
          {username && (
            <div className={style.username}>
              {`Logged in as:`}{' '}
              <span
                className={getClassName(
                  state && (state.playersUpdated || state.players)
                    ? (state.playersUpdated || state.players).find(
                        (p: PlayerDetail) => p.userId === user?._id
                      )?.color
                    : undefined
                )}
              >
                {' '}
                {username}{' '}
              </span>
            </div>
          )}
          {/* {username && state?.gameBackup?.isMulti && ( */}
          {(state?.players?.length === 2 ||
            state?.playersUpdated?.length === 2) && (
            <div className={style.username}>
              {`Your opponent:`}{' '}
              <span
                className={getClassName(
                  (state.playersUpdated || state.players).find(
                    (p: PlayerDetail) => p.userId !== user?._id
                  )?.color
                )}
              >
                {' '}
                {
                  (state.playersUpdated || state.players).find(
                    (p: PlayerDetail) => p.userId !== user?._id
                  )?.userName
                }{' '}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
