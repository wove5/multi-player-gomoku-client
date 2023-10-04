import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context';

import style from './Header.module.css';
import { PLAYER } from '../constants';
import { PlayerDetail, UserDetail } from '../types';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, username, logout } = useContext(UserContext);

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
              logout();
              navigate('/');
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

  const getClassName = (playerColor: PLAYER | undefined) => {
    switch (true) {
      case playerColor === PLAYER.BLACK:
        return style.black;
      case playerColor === PLAYER.WHITE:
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
                  state?.gameBackup?.players.find(
                    (p: PlayerDetail) => p.userId === user?._id
                  )?.color
                )}
              >
                {' '}
                {username}{' '}
              </span>
            </div>
          )}
          {username && state?.gameBackup?.isMulti && (
            <div className={style.username}>
              {`Your opponent:`}{' '}
              <span
                className={getClassName(
                  state.gameBackup?.players.find(
                    (p: PlayerDetail) => p.userId !== user?._id
                  )?.color
                )}
              >
                {' '}
                {
                  state.gameBackup?.userDetail.find(
                    (u: UserDetail) => u.userId !== user?._id
                  )?.username
                }{' '}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
