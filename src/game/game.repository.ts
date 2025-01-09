import { Injectable } from '@nestjs/common';
import { GameState } from 'src/interfaces/game.interface';

@Injectable()
export class GameRepository {
  private games = new Map<string, GameState>();
  private invites = new Map<string, Set<string>>();

  async createGame(
    player1: string,
    player2: string,
    botLevel?: 'NO-BOT' | 'EASY' | 'MEDIUM' | 'HARD',
  ): Promise<GameState> {
    const gameId = `${player1}-${player2}`;
    const game: GameState = {
      gameId,
      currentPlayer: 'X',
      winner: null,
      status: 'in-progress',
      isGameOver: false,
      players: {
        [player1]: { symbol: 'X', lastMovePositions: [] },
        [player2]: { symbol: 'O', lastMovePositions: [] },
      },
      botLevel,
      board: Array(9).fill(''),
    };
    this.games.set(gameId, game);
    return game;
  }

  async addInvite(from: string, to: string): Promise<void> {
    if (!this.invites.has(from)) {
      this.invites.set(from, new Set());
    }
    this.invites.get(from)?.add(to);
  }

  async removeInvite(from: string, to: string): Promise<void> {
    this.invites.get(from)?.delete(to);
  }

  async getInvites(userId: string): Promise<{ from: string; to: string }[]> {
    return Array.from(this.invites.get(userId) || []).map((to) => ({
      from: userId,
      to,
    }));
  }

  async updateGameMove(
    gameId: string,
    playerId: string,
    position: number,
  ): Promise<GameState> {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');
    if (game.isGameOver) throw new Error('Game is already over');
    if (game.board[position]) throw new Error('Position already taken');

    const symbol = game.players[playerId].symbol;
    game.board[position] = symbol;
    game.players[playerId].lastMovePositions.push(position);
    if (game.players[playerId].lastMovePositions.length > 3) {
      const oldPosition = game.players[playerId].lastMovePositions.shift();
      if (oldPosition !== undefined) game.board[oldPosition] = '';
    }

    if (this.checkWinner(game.board, symbol)) {
      game.winner = game.players[playerId].symbol;
      game.isGameOver = true;
      game.status = 'finished';
    } else if (!game.board.includes('')) {
      game.isGameOver = true;
      game.status = 'finished';
    } else {
      game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    }

    return game;
  }

  async endGame(gameId: string): Promise<GameState | null> {
    const game = this.games.get(gameId);
    if (game) {
      this.games.delete(gameId);
    }
    return game || null;
  }

  async performBotMove(gameId: string): Promise<GameState> {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');
    if (!game.botLevel || game.botLevel === 'NO-BOT')
      throw new Error('No bot configured for this game');

    const availablePositions = game.board
      .map((value, index) => (value === '' ? index : null))
      .filter((pos) => pos !== null) as number[];

    if (availablePositions.length === 0) {
      throw new Error('No moves left for bot');
    }

    let botMove: number;
    switch (game.botLevel) {
      case 'EASY':
        botMove =
          availablePositions[
            Math.floor(Math.random() * availablePositions.length)
          ];
        break;

      case 'MEDIUM':
        botMove =
          this.getBlockingMove(game.board, game.players, availablePositions) ??
          availablePositions[
            Math.floor(Math.random() * availablePositions.length)
          ];
        break;

      case 'HARD':
        botMove =
          this.getWinningMove(game.board, 'O') ??
          this.getBlockingMove(game.board, game.players, availablePositions) ??
          availablePositions[
            Math.floor(Math.random() * availablePositions.length)
          ];
        break;

      default:
        throw new Error('Unknown bot level');
    }

    // Perform the bot's move
    game.board[botMove] = 'O'; // Bot always uses 'O'
    game.players['bot'] = game.players['bot'] || {
      symbol: 'O',
      lastMovePositions: [],
    };
    game.players['bot'].lastMovePositions.push(botMove);

    if (game.players['bot'].lastMovePositions.length > 3) {
      const oldPosition = game.players['bot'].lastMovePositions.shift();
      if (oldPosition !== undefined) game.board[oldPosition] = '';
    }

    if (this.checkWinner(game.board, 'O')) {
      game.winner = 'bot';
      game.isGameOver = true;
      game.status = 'completed';
    } else if (!game.board.includes('')) {
      game.isGameOver = true;
      game.status = 'draw';
    } else {
      game.currentPlayer = 'X';
    }

    return game;
  }

  private checkWinner(board: string[], symbol: string): boolean {
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

    return winningCombinations.some((combination) =>
      combination.every((index) => board[index] === symbol),
    );
  }
  private getBlockingMove(
    board: string[],
    players: GameState['players'],
    availablePositions: number[],
  ): number | null {
    const opponentSymbol = 'X'; // Bot har doim 'O' bo'ladi, shuning uchun o'yinchi 'X'.
    for (const pos of availablePositions) {
      const tempBoard = [...board];
      tempBoard[pos] = opponentSymbol; // Yangi pozitsiyani simulyatsiya qilish
      if (this.checkWinner(tempBoard, opponentSymbol)) {
        return pos; // Agar o'yinchi g‘alaba qozonishi mumkin bo‘lsa, ushbu pozitsiyani qaytarish
      }
    }
    return null; // Bloklash kerak bo'lgan joy topilmadi
  }
  private getWinningMove(board: string[], botSymbol: string): number | null {
    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') {
        const tempBoard = [...board];
        tempBoard[i] = botSymbol; // Yangi pozitsiyani simulyatsiya qilish
        if (this.checkWinner(tempBoard, botSymbol)) {
          return i; // Agar bot g‘alaba qozonishi mumkin bo‘lsa, ushbu pozitsiyani qaytarish
        }
      }
    }
    return null; // G‘alaba qilish uchun joy topilmadi
  }
}
