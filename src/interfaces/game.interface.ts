export interface GameState {
  board: string[];
  currentPlayer: string;
  winner: string | null;
  isGameOver: boolean;
  players: {
    [key: string]: { symbol: 'X' | 'O'; lastMovePositions: number[] };
  };
  status: string;
  gameId: string;
  botLevel: 'EASY' | 'MEDIUM' | 'HARD' | 'NO-BOT';
}
