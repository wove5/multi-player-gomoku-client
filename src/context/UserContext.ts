import { createContext } from 'react';
import { User } from '../types';

type UserContextType = {
  user?: User;
  username: string | undefined;
  // login will set user
  login: (username: string, password: string) => Promise<true | string>;
  register: (username: string, password: string) => Promise<true | string>;

  // logout will unset user
  logout: () => void;
};

const UserContext = createContext<UserContextType>({} as UserContextType);
export default UserContext;
