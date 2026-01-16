import { useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext, GameContext } from '../context';

import style from './Header.module.css';
import { POSITION_STATUS } from '../constants';
import { PlayerDetail } from '../types';
import { API_HOST } from '../constants';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, username, logout } = useContext(UserContext);
  const { restFromGame, setHeaderHeight } = useContext(GameContext);

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
        // return style.username;
        return undefined;
    }
  };

  useEffect(() => {
    setHeaderHeight(headerRef.current?.offsetHeight);
  });

  // const headerRef = useRef<JSX.IntrinsicElements['header'] | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const oapiSwaggerLink = () => (
    <a
      className={style.anchor}
      href={`http://${window.location.hostname}:8081/api/api-docs`}
      target="_blank"
      rel="noopener noreferrer"
    >
      OAPI Swagger UI docs
    </a>
  );

  return (
    <header ref={headerRef} className={style.header}>
      <div className={style.container}>
        {!API_HOST ? (
          <>
            <div className={style['title-and-oapi-docs']}>
              <Link className={style.link} to="/">
                Gomoku
              </Link>
              <div className={style['small-screens']}>{oapiSwaggerLink()}</div>
            </div>
            <div className={style['large-screens']}>{oapiSwaggerLink()}</div>
          </>
        ) : (
          <Link className={style.link} to="/">
            Gomoku
          </Link>
        )}

        <div className={style['actions-user-detail']}>
          <div className={style.actions}>{getActions()}</div>
          {username && (
            <div className={style.username}>
              {`Logged-in:`}{' '}
              <span
                className={getClassName(
                  state && (state.playersUpdated || state.players)
                    ? (state.playersUpdated || state.players).find(
                        (p: PlayerDetail) => p.user._id === user?._id
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
                    (p: PlayerDetail) => p.user._id !== user?._id
                  )?.color
                )}
              >
                {' '}
                {
                  (state.playersUpdated || state.players).find(
                    (p: PlayerDetail) => p.user._id !== user?._id
                  )?.user.userName
                }{' '}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
