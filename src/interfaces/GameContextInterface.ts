export interface GameContextInterface {
  currentPath: string;
  previousPath: string;
  restFromGame: (gameId: string) => Promise<void>;
}
