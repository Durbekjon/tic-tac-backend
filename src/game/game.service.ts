import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUser } from 'src/interfaces/user.interface';
export interface GameState {
  board: string[];
  currentPlayer: string;
  winner: string | null;
  isGameOver: boolean;
  players: { [key: string]: string }; // playerId -> symbol (X or O)
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
      players: { [playerId]: 'X' },
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
    game.players[otherPlayerId] = 'O';
    game.status = 'in-progress';
    return game;
  }

  async makeMove(gameId: string, playerId: string, position: number) {
    try {
      const game = this.games.get(gameId);

      if (!game || game.isGameOver) {
        return;
      }

      game.board[position] = game.players[playerId];
      game.currentPlayer = game.players[playerId] === 'X' ? 'O' : 'X';

      const winner = this.checkWinner(game.board);
      if (winner) {
        game.winner = winner;
        game.isGameOver = true;
        game.status = 'game-over';
      } else if (game.board.every((cell) => cell !== '')) {
        game.status = 'game-over';
        game.isGameOver = true;
      }
      this.games.set(gameId, game);
      return game;
    } catch (error) {
      console.error(error);
    }
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
      game.winner = playerId === game.players['X'] ? 'O' : 'X';
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
