import { Header, UserProvider, GameProvider } from './components';
import style from './App.module.css';
import { Game, GameLog, Games, Home, Login, SignUp } from './pages';
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <UserProvider>
      <GameProvider>
        <Header />
        <main className={style.main}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="sign-up" element={<SignUp />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/game-log/:gameId" element={<GameLog />} />
            <Route path="/games" element={<Games />} />
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </GameProvider>
    </UserProvider>
  );
}

export default App;
