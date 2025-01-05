import { Injectable } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { PlayerRepository } from './player.repository';

@Injectable()
export class GameService {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async addPlayer(player: { userId: string; username: string }): Promise<void> {
    await this.playerRepository.addPlayer(player);
  }

  async removePlayer(userId: string): Promise<void> {
    await this.playerRepository.removePlayer(userId);
  }

  async getOnlinePlayers(): Promise<{ userId: string; username: string }[]> {
    return await this.playerRepository.getOnlinePlayers();
  }

  async addInvite(from: string, to: string): Promise<void> {
    await this.gameRepository.addInvite(from, to);
  }

  async removeInvite(from: string, to: string): Promise<void> {
    await this.gameRepository.removeInvite(from, to);
  }

  async getInvites(userId: string): Promise<{ from: string; to: string }[]> {
    return await this.gameRepository.getInvites(userId);
  }

  async startGame(
    player1: string,
    player2: string,
    botLevel?: 'EASY' | 'MEDIUM' | 'HARD' | 'NO-BOT',
  ): Promise<any> {
    return await this.gameRepository.createGame(player1, player2, botLevel);
  }

  async makeMove(
    gameId: string,
    playerId: string,
    position: number,
  ): Promise<any> {
    return await this.gameRepository.updateGameMove(gameId, playerId, position);
  }

  async leaveGame(gameId: string, playerId: string): Promise<any> {
    return await this.gameRepository.endGame(gameId);
  }

  async botMove(gameId: string): Promise<any> {
    return await this.gameRepository.performBotMove(gameId);
  }
}
