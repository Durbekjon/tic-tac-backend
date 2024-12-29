import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../shared/constants';
import { Logger } from '@nestjs/common';

interface GameInvite {
  from: string;
  to: string;
  user: any;
}

interface GameState {
  board: string[];
  currentPlayer: string;
  winner: string | null;
  isGameOver: boolean;
  players: { [key: string]: string };
  status: 'waiting' | 'in-progress' | 'finished';
  gameId?: string;
  startTime?: number;
  lastMoveTime?: number;
  spectators?: string[];
  moves?: { player: string; position: number; timestamp: number }[];
}

interface UserStatus {
  userId: string;
  status: 'online' | 'in-game' | 'offline';
  currentGameId?: string;
  lastActive: number;
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  allowEIO3: true,
  allowUpgrades: true,
  cookie: false,
})
export class GameGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private games: Map<string, GameState> = new Map();
  private activeGames: Map<string, string> = new Map();
  private onlineUsers: Map<
    string,
    { userId: string; firstName: string; lastName: string }
  > = new Map();
  private userSockets: Map<string, string[]> = new Map();
  private userStatus: Map<string, UserStatus> = new Map();
  private inactivityTimeout = 5 * 60 * 1000;
  private maxGamesPerUser = 5;
  private gameTimeLimit = 10 * 60 * 1000;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    setInterval(() => this.cleanupInactiveGames(), 60000);
    setInterval(() => this.cleanupInactiveUsers(), 10000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const user = this.onlineUsers.get(client.id);
    if (user) {
      const userId = user.userId;
      const userSocketIds = this.userSockets.get(userId) || [];
      const updatedSocketIds = userSocketIds.filter((id) => id !== client.id);

      if (updatedSocketIds.length === 0) {
        this.handleUserOffline(userId);
      } else {
        this.userSockets.set(userId, updatedSocketIds);
      }
      this.onlineUsers.delete(client.id);
    }
  }

  private handleUserOffline(userId: string) {
    this.userSockets.delete(userId);
    this.updateUserStatus(userId, 'offline');
    this.handleDisconnectedPlayerGames(userId);
    this.broadcastOnlineUsers();
  }

  private handleDisconnectedPlayerGames(userId: string) {
    const gameId = this.activeGames.get(userId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game && game.status === 'in-progress') {
        const opponent = Object.keys(game.players).find((id) => id !== userId);
        if (opponent) {
          game.winner = opponent;
          game.isGameOver = true;
          game.status = 'finished';
          this.games.set(gameId, game);
          this.server.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
          this.cleanupGame(gameId);
        }
      }
    }
  }

  private updateUserStatus(
    userId: string,
    status: 'online' | 'in-game' | 'offline',
    userData?: any,
    gameId?: string,
  ) {
    const userStatus: UserStatus = {
      userId,
      status,
      currentGameId: gameId,
      lastActive: Date.now(),
      user: userData,
    };
    this.userStatus.set(userId, userStatus);
    this.server.emit(SOCKET_EVENTS.USER_STATUS_UPDATED, userStatus);
  }

  @SubscribeMessage(SOCKET_EVENTS.USER_CONNECTED)
  async handleUserConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId: string; firstName: string; lastName: string },
  ) {
    this.logger.log(`User ${data.userId} connected via socket ${client.id}`);
    this.onlineUsers.set(client.id, {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    const userSocketIds = this.userSockets.get(data.userId) || [];
    userSocketIds.push(client.id);
    this.userSockets.set(data.userId, userSocketIds);

    this.updateUserStatus(data.userId, 'online', {
      firstName: data.firstName,
      lastName: data.lastName,
    });
    this.syncUserState(client, data.userId);
    this.broadcastOnlineUsers();
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_GAME)
  async handleLeaveGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const game = this.games.get(data.gameId);
    if (game && game.status === 'in-progress') {
      const opponent = Object.keys(game.players).find(
        (id) => id !== data.playerId,
      );
      if (opponent) {
        this.server.emit(SOCKET_EVENTS.GAME_ENDED, game);
        this.handleGameWin(game, opponent);
        this.cleanupGame(data.gameId);
      }
    } else if (game && game.status === 'finished') {
      this.cleanupGame(data.gameId);
    }
  }

  private async syncUserState(client: Socket, userId: string) {
    const gameId = this.activeGames.get(userId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        client.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
      }
    }

    client.emit(SOCKET_EVENTS.ONLINE_USERS, this.getOnlineUsers());
    const statuses = Array.from(this.userStatus.values());
    client.emit(SOCKET_EVENTS.ALL_USER_STATUSES, statuses);
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_GAME_INVITE)
  async handleGameInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GameInvite,
  ) {
    if (!this.canStartNewGame(data.from)) {
      client.emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'You have reached the maximum number of active games',
      });
      return;
    }

    const targetUserSockets = this.userSockets.get(data.to);
    if (!targetUserSockets?.length) {
      client.emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Target player is offline',
      });
      return;
    }

    if (this.isUserInGame(data.to)) {
      client.emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Target player is already in a game',
      });
      return;
    }

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialGameState: GameState = {
      board: Array(9).fill(''),
      currentPlayer: data.from,
      winner: null,
      isGameOver: false,
      players: {
        [data.from]: 'X',
        [data.to]: 'O',
      },
      status: 'waiting',
      gameId,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      spectators: [],
      moves: [],
    };

    this.games.set(gameId, initialGameState);
    targetUserSockets.forEach((socketId) => {
      this.server.to(socketId).emit(SOCKET_EVENTS.GAME_INVITE, {
        gameId,
        from: data.from,
        user: data.user,
      });
    });
  }

  private canStartNewGame(userId: string): boolean {
    let activeGameCount = 0;
    this.games.forEach((game) => {
      if (game.players[userId] && game.status === 'in-progress') {
        activeGameCount++;
      }
    });
    return activeGameCount < this.maxGamesPerUser;
  }

  private isUserInGame(userId: string): boolean {
    return this.activeGames.has(userId);
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_AS_SPECTATOR)
  async handleSpectatorJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; userId: string },
  ) {
    const game = this.games.get(data.gameId);
    if (!game) {
      client.emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Game not found',
      });
      return;
    }

    if (!game.spectators) {
      game.spectators = [];
    }

    if (!game.spectators.includes(data.userId)) {
      game.spectators.push(data.userId);
      this.games.set(data.gameId, game);
    }

    client.join(data.gameId);
    client.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
  }

  @SubscribeMessage(SOCKET_EVENTS.MAKE_MOVE)
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string; position: number },
  ) {
    const game = this.games.get(data.gameId);
    if (!this.isValidMove(game, data)) {
      return;
    }

    game.board[data.position] = game.players[data.playerId];
    game.lastMoveTime = Date.now();
    game.moves?.push({
      player: data.playerId,
      position: data.position,
      timestamp: Date.now(),
    });

    if (this.checkWinner(game.board)) {
      this.handleGameWin(game, data.playerId);
      this.server.emit(SOCKET_EVENTS.GAME_ENDED, game);
    } else if (this.isDraw(game.board)) {
      this.handleGameDraw(game);
      this.server.emit(SOCKET_EVENTS.GAME_ENDED, game);
    } else {
      this.handleNextTurn(game, data.playerId);
    }

    this.games.set(data.gameId, game);
    this.server.emit(SOCKET_EVENTS.MOVE_MADE, game);
    this.server.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
  }

  private isValidMove(
    game: GameState | undefined,
    data: { gameId: string; playerId: string; position: number },
  ): boolean {
    if (!game || game.status !== 'in-progress') {
      this.server.to(data.gameId).emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Invalid game or game not in progress',
      });
      return false;
    }

    if (game.currentPlayer !== data.playerId) {
      this.server.to(data.gameId).emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Not your turn',
      });
      return false;
    }

    if (
      data.position < 0 ||
      data.position >= game.board.length ||
      game.board[data.position] !== ''
    ) {
      this.server.to(data.gameId).emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Invalid move position',
      });
      return false;
    }

    return true;
  }

  private handleNextTurn(game: GameState, currentPlayer: string) {
    const nextPlayer = Object.keys(game.players).find(
      (id) => id !== currentPlayer,
    );
    if (nextPlayer) {
      game.currentPlayer = nextPlayer;
    }
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

    for (const combo of winningCombinations) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  private isDraw(board: string[]): boolean {
    return board.every((cell) => cell !== '');
  }

  private handleGameWin(game: GameState, winnerId: string) {
    game.winner = winnerId;
    game.isGameOver = true;
    game.status = 'finished';
    this.cleanupGame(game.gameId!);
  }

  private handleGameDraw(game: GameState) {
    game.winner = null;
    game.isGameOver = true;
    game.status = 'finished';
    this.cleanupGame(game.gameId!);
  }

  private cleanupGame(gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      Object.keys(game.players).forEach((playerId) => {
        this.activeGames.delete(playerId);
        this.updateUserStatus(playerId, 'online');
      });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ACCEPT_INVITE)
  async handleAcceptInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string; user: any },
  ) {
    const game = this.games.get(data.gameId);
    if (!game) {
      client.emit(SOCKET_EVENTS.GAME_ERROR, {
        message: 'Game not found',
      });
      return;
    }

    game.status = 'in-progress';
    this.games.set(data.gameId, game);

    const players = Object.keys(game.players);
    players.forEach((playerId) => {
      this.activeGames.set(playerId, data.gameId);
      this.updateUserStatus(playerId, 'in-game', data.gameId);
    });

    // Emit both game started and state updated events
    this.server.emit(SOCKET_EVENTS.GAME_STARTED, {
      ...game,
    });
    this.server.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
    this.logger.log(`Game ${data.gameId} started`);
  }

  private cleanupInactiveGames() {
    const now = Date.now();
    this.games.forEach((game, gameId) => {
      if (
        game.status === 'in-progress' &&
        now - (game.lastMoveTime || 0) > this.gameTimeLimit
      ) {
        game.status = 'finished';
        game.isGameOver = true;
        this.cleanupGame(gameId);
        this.server.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
      }
    });
  }

  private cleanupInactiveUsers() {
    const now = Date.now();
    this.userStatus.forEach((status, userId) => {
      if (
        status.status !== 'offline' &&
        now - status.lastActive > this.inactivityTimeout
      ) {
        this.handleUserOffline(userId);
      }
    });
  }

  private broadcastOnlineUsers() {
    const users = this.getOnlineUsers();
    this.server.emit(SOCKET_EVENTS.ONLINE_USERS, users);
  }

  private getOnlineUsers() {
    return Array.from(this.userStatus.entries())
      .filter(([_, status]) => status.status !== 'offline' && status.user)
      .map(([userId, data]) => ({ userId, ...data }));
  }
}
