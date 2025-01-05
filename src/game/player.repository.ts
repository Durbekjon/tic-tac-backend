import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerRepository {
  private players = new Map<string, { userId: string; username: string }>();

  async addPlayer(player: { userId: string; username: string }): Promise<void> {
    this.players.set(player.userId, player);
  }

  async removePlayer(userId: string): Promise<void> {
    this.players.delete(userId);
  }

  async getOnlinePlayers(): Promise<{ userId: string; username: string }[]> {
    return Array.from(this.players.values());
  }
}
