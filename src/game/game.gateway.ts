import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { GameService } from './game.service';
import { SOCKET_EVENTS } from 'shared/constants';
import { IUser } from 'src/interfaces/user.interface';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private connectedPlayers: { [key: string]: string } = {};
  private userIds = new Map<string, string>(); // playerId -> userId
  constructor(
    private readonly gameService: GameService,
    private logger: Logger,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.deletePlayerId(client.id);
  }

  sendOnlineUsers() {
    const players = this.gameService.getOnlinePlayers();
    this.server.emit(SOCKET_EVENTS.ONLINE_USERS, players);
  }

  @SubscribeMessage(SOCKET_EVENTS.USER_CONNECTED)
  handleUserConnected(client: Socket, user: IUser) {
    this.connectedPlayers[user.userId] = client.id;
    this.gameService.addPlayer(user);
    this.savePlayerId(client.id, user.userId);
    this.sendOnlineUsers();
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_GAME_INVITE)
  handleGameInvite(
    client: Socket,
    data: { from: string; to: string; user: any },
  ) {
    this.server
      .to(this.connectedPlayers[data.to])
      .emit(SOCKET_EVENTS.GAME_INVITE, data);

    this.gameService.addInvite(data.from, data.to);

    const userInvites = this.gameService.getInvites(data.from);
    console.log(userInvites);
    this.server
      .to(this.connectedPlayers[data.from])
      .emit(SOCKET_EVENTS.INVITE_SENT, userInvites);

    this.gameService.createGame(data.from);
  }

  @SubscribeMessage(SOCKET_EVENTS.REJECT_INVITE)
  handleRejectInvite(client: Socket, data: { from: string; to: string }) {
    this.gameService.removeInvite(data.from, data.to);
    const userInvites = this.gameService.getInvites(data.from);
    this.server
      .to(this.connectedPlayers[data.from])
      .emit(SOCKET_EVENTS.INVITE_SENT, userInvites);
    this.server.to(this.connectedPlayers[data.from]).emit(SOCKET_EVENTS.REJECT);
  }

  @SubscribeMessage(SOCKET_EVENTS.ACCEPT_INVITE)
  async handleAcceptInvite(client: Socket, data: { from: string; to: string }) {
    const game = await this.gameService.startGame(data.from, data.to);
    this.server
      .to(this.connectedPlayers[data.from])
      .to(this.connectedPlayers[data.to])
      .emit(SOCKET_EVENTS.GAME_STARTED, game);

    this.gameService.removeInvite(data.from, data.to);
    const userInvites = this.gameService.getInvites(data.from);
    this.server
      .to(this.connectedPlayers[data.from])
      .emit(SOCKET_EVENTS.INVITE_SENT, userInvites);
  }

  @SubscribeMessage(SOCKET_EVENTS.MAKE_MOVE)
  async handleMakeMove(
    client: Socket,
    data: { gameId: string; playerId: string; position: number },
  ) {
    const game = await this.gameService.makeMove(
      data.gameId,
      data.playerId,
      data.position,
    );

    this.server.emit(SOCKET_EVENTS.MOVE_MADE, game);
    this.server.emit(SOCKET_EVENTS.GAME_STATE_UPDATED, game);
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_GAME)
  async handleLeaveGame(
    client: Socket,
    data: { gameId: string; playerId: string },
  ) {
    const game = await this.gameService.leaveGame(data.gameId, data.playerId);
    this.server.to(data.gameId).emit(SOCKET_EVENTS.GAME_ENDED, game);
  }

  private savePlayerId(playerId: string, userId: string) {
    this.userIds.set(playerId, userId);
  }
  private deletePlayerId(playerId: string) {
    const userId = this.userIds.get(playerId);
    if (userId) {
      delete this.connectedPlayers[userId];

      this.gameService.removePlayer(userId);
      this.userIds.delete(playerId);
      this.sendOnlineUsers();
    }
  }
}
