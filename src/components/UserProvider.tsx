import { useState } from 'react';
import { User, Credential } from '../types';
import { UserContext } from '../context';
import { post, setToken } from '../utils/http';
import { API_HOST } from '../constants';

type UserProviderProps = {
  children: React.ReactNode;
};

export default function UserProvider({ children }: UserProviderProps) {
  // TBC: const [gamesPlaying] = useLocalStorage<string[]>('gamesPlaying', []);
  const getUser = (): User | undefined => {
    const item = localStorage.getItem('user');
    if (!item) {
      localStorage.removeItem('user');
      return undefined;
    } else {
      return JSON.parse(item);
    }
    // return item ? JSON.parse(item) : undefined;
  };

  const getUsername = (): string | undefined => {
    const item = localStorage.getItem('username');
    if (!item) {
      localStorage.removeItem('username');
      return undefined;
    } else {
      return JSON.parse(item);
    }
  };

  const [user, setUser] = useState<User | undefined>(getUser);
  const [username, setUsername] = useState<string | undefined>(getUsername);
  if (user) {
    setToken(user.token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('username', JSON.stringify(username));
  }

  const login = async (username: string, password: string) => {
    try {
      const user = await post<Credential, User>(`${API_HOST}/api/auth/login`, {
        username,
        password,
      });
      setUser(user);
      setUsername(username);
      setToken(user.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('username', JSON.stringify(username));
      return true;
    } catch (err: any) {
      if (err instanceof Error) {
        return err.message;
      }
      return 'Unable to login now. Try again later.';
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const user = await post<Credential, User>(
        `${API_HOST}/api/auth/register`,
        {
          username,
          password,
        }
      );
      setUser(user);
      setUsername(username);
      setToken(user.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('username', JSON.stringify(username));
      return true;
    } catch (err: any) {
      if (err instanceof Error) {
        return err.message;
      }
      return 'Unable to login now. Try again later.';
    }
  };

  const logout = () => {
    setUser(undefined);
    setUsername(undefined);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
  };

  return (
    <UserContext.Provider value={{ user, username, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
}
