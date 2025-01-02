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
  }; // playerId -> symbol (X or O)
  status: string; // 'waiting', 'in-progress', 'game-over'
  gameId: string;
}

@Injectable()
export class GameService {
  private games = new Map<string, GameState>();
  private players = new Map<string, IUser>(); // playerId -> userData
  private userSentInvites = new Map<string, string[]>(); // playerId -> invitedPlayerId
  getOnlinePlayers() {
    return Array.from(this.players).map(([_, player]) => player);
  }

  addPlayer(user: IUser) {
    this.players.set(user.chatId, user);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
  }

  createGame(playerId: string) {
    const gameId = randomUUID();
    this.games.set(gameId, {
      board: Array(9).fill(''),
      currentPlayer: 'X',
      winner: null,
      isGameOver: false,
      players: { [playerId]: { symbol: 'X', lastMovePositions: [] } },
      status: 'waiting',
      gameId,
    });
    return this.games.get(gameId);
  }

  addInvite(playerId: string, invitedPlayerId: string) {
    const invites = this.userSentInvites.get(playerId) || [];
    if (invites.includes(invitedPlayerId)) return;
    invites.push(invitedPlayerId);
    this.userSentInvites.set(playerId, invites);
  }
  removeInvite(playerId: string, invitedPlayerId: string) {
    const invites = this.userSentInvites.get(playerId) || [];
    const index = invites.indexOf(invitedPlayerId);
    if (index !== -1) {
      invites.splice(index, 1);
      this.userSentInvites.set(playerId, invites);
    }
  }

  getInvites(playerId: string) {
    return this.userSentInvites.get(playerId) || [];
  }

  async startGame(playerId: string, otherPlayerId: string) {
    const game = this.createGame(playerId);
    game.players[otherPlayerId] = { symbol: 'O', lastMovePositions: [] };
    game.status = 'in-progress';
    return game;
  }

  async makeMove(gameId: string, playerId: string, position: number) {
    try {
      const game = this.games.get(gameId);

      if (!game || game.isGameOver) {
        return;
      }

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
      if (game.players[playerId].lastMovePositions.length > 3 && !game.winner) {
        game.board[game.players[playerId].lastMovePositions[0]] = '';
        game.players[playerId].lastMovePositions.shift();
      }

      this.games.set(gameId, game);
      return game;
    } catch (error) {
      console.error(error);
    }
  }

  async botMove(gameId: string) {
    const game = this.games.get(gameId);
    if (!game || game.isGameOver) return game;

    const bot = game.players['bot'];
    // const playerSymbol = Object.keys(game.players).find(
    //   (playerId) => game.players[playerId] !== botSymbol,
    // );
    const playerSymbol = 'X';
    const minimax = (board: string[], isMaximizing: boolean): number => {
      const winner = this.checkWinner(board);
      if (winner === bot.symbol) return 10;
      if (winner === playerSymbol) return -10;
      if (board.every((cell) => cell !== '')) return 0;

      const scores: number[] = [];
      for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
          board[i] = isMaximizing ? bot.symbol : playerSymbol;
          scores.push(minimax(board, !isMaximizing));
          board[i] = '';
        }
      }
      return isMaximizing ? Math.max(...scores) : Math.min(...scores);
    };

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < game.board.length; i++) {
      if (game.board[i] === '') {
        game.board[i] = bot.symbol;
        const score = minimax(game.board, false);
        game.board[i] = '';
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    // Bot harakatini amalga oshirish
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
        game.board[game.players['bot'].lastMovePositions[0]] = '';
        game.players['bot'].lastMovePositions.shift();
      }

      this.games.set(gameId, game);
    }

    return game;
  }

  endGame(gameId: string, playerId: string) {
    const game = this.games.get(gameId);
    if (game) {
      game.isGameOver = true;
      game.status = 'game-over';
      this.games.delete(gameId);
    }
    return game;
  }

  leaveGame(gameId: string, playerId: string) {
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

    for (let i = 0; i < winningCombinations.length; i++) {
      const [a, b, c] = winningCombinations[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // 'X' or 'O'
      }
    }
    return null;
  }
}
