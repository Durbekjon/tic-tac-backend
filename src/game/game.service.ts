import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUser } from 'src/interfaces/user.interface';

export interface GameState {
  board: string[];
  currentPlayer: string;
  winner: string | null;
  isGameOver: boolean;
  players: {
    [key: string]: { symbol: 'X' | 'O'; lastMovePositions: number[] };
  };
  status: string; // 'waiting', 'in-progress', 'game-over'
  gameId: string;
}

@Injectable()
export class GameService {
  private games = new Map<string, GameState>();
  private players = new Map<string, IUser>(); // playerId -> userData
  private userSentInvites = new Map<string, string[]>(); // playerId -> invitedPlayerId

  getOnlinePlayers() {
    return Array.from(this.players.values());
  }

  addPlayer(user: IUser) {
    this.players.set(user.chatId, user);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
  }

  createGame(playerId: string): GameState {
    const gameId = randomUUID();
    const initialGameState: GameState = {
      board: Array(9).fill(''),
      currentPlayer: 'X',
      winner: null,
      isGameOver: false,
      players: { [playerId]: { symbol: 'X', lastMovePositions: [] } },
      status: 'waiting',
      gameId,
    };
    this.games.set(gameId, initialGameState);
    return initialGameState;
  }

  addInvite(playerId: string, invitedPlayerId: string) {
    const invites = this.userSentInvites.get(playerId) || [];
    if (!invites.includes(invitedPlayerId)) {
      invites.push(invitedPlayerId);
      this.userSentInvites.set(playerId, invites);
    }
  }

  removeInvite(playerId: string, invitedPlayerId: string) {
    const invites = this.userSentInvites.get(playerId) || [];
    const index = invites.indexOf(invitedPlayerId);
    if (index !== -1) {
      invites.splice(index, 1);
      this.userSentInvites.set(playerId, invites);
    }
  }

  getInvites(playerId: string): string[] {
    return this.userSentInvites.get(playerId) || [];
  }

  async startGame(playerId: string, otherPlayerId: string): Promise<GameState> {
    const game = this.createGame(playerId);
    game.players[otherPlayerId] = { symbol: 'O', lastMovePositions: [] };
    game.status = 'in-progress';
    return game;
  }

  async makeMove(
    gameId: string,
    playerId: string,
    position: number,
  ): Promise<GameState | undefined> {
    const game = this.games.get(gameId);
    if (!game || game.isGameOver) return;

    this.updateGameBoard(game, playerId, position);

    if (game.players[playerId].lastMovePositions.length > 3 && !game.winner) {
      this.removeOldMove(game, playerId);
    }

    this.games.set(gameId, game);
    return game;
  }

  private updateGameBoard(game: GameState, playerId: string, position: number) {
    game.board[position] = game.players[playerId].symbol;
    game.currentPlayer = game.players[playerId].symbol === 'X' ? 'O' : 'X';

    const winner = this.checkWinner(game.board);
    if (winner) {
      game.winner = winner;
      game.isGameOver = true;
      game.status = 'game-over';
    } else if (game.board.every((cell) => cell !== '')) {
      game.status = 'game-over';
      game.isGameOver = true;
    }

    game.players[playerId].lastMovePositions.push(position);
  }

  private removeOldMove(game: GameState, playerId: string) {
    const oldestMove = game.players[playerId].lastMovePositions.shift();
    if (oldestMove !== undefined) {
      game.board[oldestMove] = '';
    }
  }

  async botMove(gameId: string): Promise<GameState | undefined> {
    const game = this.games.get(gameId);
    if (!game || game.isGameOver) return game;

    const bot = game.players['bot'];
    const playerSymbol = 'X';
    const bestMove = this.calculateBestMove(
      game.board,
      bot.symbol,
      playerSymbol,
    );

    if (bestMove !== -1) {
      game.board[bestMove] = bot.symbol;
      game.currentPlayer = playerSymbol;

      const winner = this.checkWinner(game.board);
      if (winner) {
        game.winner = winner;
        game.isGameOver = true;
        game.status = 'game-over';
      } else if (game.board.every((cell) => cell !== '')) {
        game.isGameOver = true;
        game.status = 'game-over';
      }

      game.players['bot'].lastMovePositions.push(bestMove);
      if (game.players['bot'].lastMovePositions.length >= 4) {
        this.removeOldMove(game, 'bot');
      }

      this.games.set(gameId, game);
    }

    return game;
  }

  private calculateBestMove(
    board: string[],
    botSymbol: string,
    playerSymbol: string,
  ): number {
    const minimax = (board: string[], isMaximizing: boolean): number => {
      const winner = this.checkWinner(board);
      if (winner === botSymbol) return 10;
      if (winner === playerSymbol) return -10;
      if (board.every((cell) => cell !== '')) return 0;

      const scores: number[] = [];
      for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
          board[i] = isMaximizing ? botSymbol : playerSymbol;
          scores.push(minimax(board, !isMaximizing));
          board[i] = '';
        }
      }
      return isMaximizing ? Math.max(...scores) : Math.min(...scores);
    };

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') {
        board[i] = botSymbol;
        const score = minimax(board, false);
        board[i] = '';
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  }

  endGame(gameId: string, playerId: string): GameState | undefined {
    const game = this.games.get(gameId);
    if (game) {
      game.isGameOver = true;
      game.status = 'game-over';
      this.games.delete(gameId);
    }
    return game;
  }

  leaveGame(gameId: string, playerId: string): GameState | undefined {
    const game = this.games.get(gameId);
    if (game) {
      game.isGameOver = true;
      game.status = 'game-over';
      game.winner = game.players[playerId].symbol === 'X' ? 'O' : 'X';
      this.games.set(gameId, game);
    }
    return game;
  }

  private checkWinner(board: string[]): string | null {
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (let [a, b, c] of winningCombinations) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // 'X' or 'O'
      }
    }
    return null;
  }
}
