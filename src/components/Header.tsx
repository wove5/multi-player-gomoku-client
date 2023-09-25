import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context';

import style from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, username, logout } = useContext(UserContext);

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

  return (
    <header className={style.header}>
      <div className={style.container}>
        <Link className={style.link} to="/">
          Gomoku
        </Link>
        <div className={style['actions-user-detail']}>
          <div className={style.actions}>{getActions()}</div>
          {username && (
            <div className={style.username}>{`Logged in as: ${username}`}</div>
          )}
        </div>
      </div>
    </header>
  );
}
