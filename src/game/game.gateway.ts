import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { GameService } from './game.service';
import { SOCKET_EVENTS } from 'src/constants';
import { IUser } from 'src/interfaces/user.interface';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server: Server;
  private readonly connectedPlayers: Map<string, string> = new Map(); // userId -> socketId
  private readonly socketToUserId: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private readonly gameService: GameService,
    private readonly logger: Logger,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.removePlayer(client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.USER_CONNECTED)
  handleUserConnected(client: Socket, user: IUser): void {
    if (!user || !user.userId) {
      this.logger.warn(`Invalid user data from client: ${client.id}`);
      return;
    }

    this.addPlayer(user.userId, client.id);
    this.gameService.addPlayer(user);
    this.emitOnlineUsers();
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_GAME_INVITE)
  async handleGameInvite(
    client: Socket,
    { from, to }: { from: string; to: string },
  ): Promise<void> {
    const recipientSocket = this.connectedPlayers.get(to);
    if (!recipientSocket) {
      this.logger.warn(`Recipient not found: ${to}`);
      return;
    }

    await Promise.all([
      this.gameService.addInvite(from, to),
      this.server
        .to(recipientSocket)
        .emit(SOCKET_EVENTS.GAME_INVITE, { from, to }),
    ]);

    this.emitInvites(from);
  }

  @SubscribeMessage(SOCKET_EVENTS.REJECT_INVITE)
  handleRejectInvite(
    client: Socket,
    { from, to }: { from: string; to: string },
  ): void {
    this.gameService.removeInvite(from, to);
    this.emitInvites(from);
    this.server.to(this.connectedPlayers.get(from)).emit(SOCKET_EVENTS.REJECT);
  }

  @SubscribeMessage(SOCKET_EVENTS.ACCEPT_INVITE)
  async handleAcceptInvite(
    client: Socket,
    { from, to }: { from: string; to: string },
  ): Promise<void> {
    const game = await this.gameService.startGame(from, to);
    this.emitGameEvents(game, SOCKET_EVENTS.GAME_STARTED);
    this.gameService.removeInvite(from, to);
    this.emitInvites(from);
  }

  @SubscribeMessage(SOCKET_EVENTS.MAKE_MOVE)
  async handleMakeMove(
    client: Socket,
    {
      gameId,
      playerId,
      position,
    }: { gameId: string; playerId: string; position: number },
  ): Promise<void> {
    const game = await this.gameService.makeMove(gameId, playerId, position);
    this.emitGameEvents(game, SOCKET_EVENTS.MOVE_MADE);

    if (game.players.bot?.symbol === 'O' && !game.isGameOver) {
      await this.handleBotMove(gameId);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_GAME)
  async handleLeaveGame(
    client: Socket,
    { gameId, playerId }: { gameId: string; playerId: string },
  ): Promise<void> {
    const game = await this.gameService.leaveGame(gameId, playerId);
    this.server.to(gameId).emit(SOCKET_EVENTS.GAME_ENDED, game);
  }

  @SubscribeMessage(SOCKET_EVENTS.PLAY_WITH_BOT)
  async handlePlayWithBot(
    client: Socket,
    {
      userId,
      botLevel,
    }: { userId: string; botLevel: 'EASY' | 'MEDIUM' | 'HARD' },
  ): Promise<void> {
    const game = await this.gameService.startGame(userId, 'bot', botLevel);
    this.server
      .to(this.connectedPlayers.get(userId))
      .emit(SOCKET_EVENTS.GAME_STARTED, game);
  }

  private async handleBotMove(gameId: string): Promise<void> {
    const game = await this.gameService.botMove(gameId);
    setTimeout(() => {
      this.emitGameEvents(game, SOCKET_EVENTS.MOVE_MADE);
    }, 2000);
  }

  private addPlayer(userId: string, socketId: string): void {
    this.connectedPlayers.set(userId, socketId);
    this.socketToUserId.set(socketId, userId);
  }

  private removePlayer(socketId: string): void {
    const userId = this.socketToUserId.get(socketId);
    if (userId) {
      this.connectedPlayers.delete(userId);
      this.socketToUserId.delete(socketId);
      this.gameService.removePlayer(userId);
      this.emitOnlineUsers();
    }
  }

  private async emitOnlineUsers(): Promise<void> {
    const players = await this.gameService.getOnlinePlayers();
    if (players.length > 0) {
      this.server.emit(SOCKET_EVENTS.ONLINE_USERS, players);
    }
  }

  private async emitInvites(userId: string) {
    const invites = await this.gameService.getInvites(userId);

    this.server
      .to(this.connectedPlayers.get(userId))
      .emit(SOCKET_EVENTS.INVITE_SENT, invites);
  }

  private emitGameEvents(game: any, event: string): void {
    const playerSockets = Object.keys(game.players).map((playerId) =>
      this.connectedPlayers.get(playerId),
    );
    this.server.to(playerSockets).emit(event, game);
  }
}
