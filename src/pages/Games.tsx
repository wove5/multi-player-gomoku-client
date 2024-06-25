import { useCallback, useContext, useEffect, useState } from 'react';
import { GameContext, UserContext } from '../context';
import style from './Games.module.css';
import { API_HOST, GAMESTATUS } from '../constants';
import { useNavigate } from 'react-router-dom';
import { CompletedGameData } from '../interfaces';
import { get } from '../utils/http';
import { PageNotFound, SessionExpired } from '../components';

export default function Games() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const { previousPath, headerHeight } = useContext(GameContext);

  const [completedGames, setCompletedGames] = useState<CompletedGameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [noGamesFound, setNoGamesFound] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const result = await get<CompletedGameData[]>(`${API_HOST}/api/games`);
      // a custom handler in games API returns a 404 Not Found if no games found
      setCompletedGames(result);
      setLoading(false);
    } catch (err: any) {
      console.log(`err.message = ${err.message}`);
      console.log(`err.status = ${err.status}`);
      console.log(`err = ${err}`);
      setCompletedGames([]);
      setLoading(false);
      if (
        err.message === 'Invalid token' ||
        err.message === 'Token missing' ||
        err.message === 'Invalid user'
      ) {
        logout();
      } else if (err.message === 'Not Found') {
        setNoGamesFound(true);
      }
    }
  }, [logout]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  if (!user) return <SessionExpired styleName={style['loading-result']} />;

  if (completedGames.length === 0) {
    if (loading) {
      return (
        <span className={style['loading-games-state']}>Retrieving games</span>
      );
    } else if (noGamesFound) {
      return (
        <PageNotFound
          previousPath={previousPath}
          message="No completed games found"
        />
      );
    } else {
      return (
        <PageNotFound
          previousPath={previousPath}
          message="Games not found - network or server issue. Try again later"
        />
      );
    }
  }

  const getDateInfoString = (updated: Date, created: Date) => {
    const end = new Date(updated).toLocaleString().split(',')[0];
    const start = new Date(created).toLocaleString().split(',')[0];
    return end === start ? `@${end}` : `⧖${start} -> ${end}`;
  };

  const theCompletedGames = completedGames.map((g) => {
    const dateInfoString = getDateInfoString(g.updatedAt, g.createdAt);
    const summary =
      g.status === GAMESTATUS.WON ? (
        <div>
          <span className={style.summary}>{`Game-${g.gameNumber}`}</span>
          <span className={style.summary}>{`${dateInfoString}`}</span>
          <span
            className={style.summary}
          >{`Winner: ${g.lastSelectedPosition.status}`}</span>
        </div>
      ) : (
        <div>
          <span className={style.summary}>{`Game-${g.gameNumber}`}</span>
          <span className={style.summary}>{`${dateInfoString}`}</span>
          <span className={style.summary}>Game is a draw</span>
        </div>
      );

    return (
      <div className={style.gameSummary} key={g._id}>
        {summary}
        <button
          className={style.button}
          onClick={() => {
            navigate(`/game-log/${g._id}`);
          }}
        >
          View Game log
        </button>
      </div>
    );
  });

  return (
    <div
      className={style.container}
      style={{ paddingTop: `${(headerHeight ?? 85) / 16}rem` }}
    >
      {theCompletedGames}
    </div>
  );
}
