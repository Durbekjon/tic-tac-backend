import { Injectable } from '@nestjs/common';
import { RatingRepository } from './rating.repository';

@Injectable()
export class RatingService {
  constructor(private readonly ratingRepository: RatingRepository) {}

  async updatePlayerRating(userId: string, points: number): Promise<void> {
    const currentRating = await this.ratingRepository.getRating(userId);
    const updatedRating = this.calculateNewRating(currentRating, points);
    await this.ratingRepository.updateRating(userId, updatedRating);
  }

  async getTopPlayers(limit: number): Promise<any[]> {
    return await this.ratingRepository.getTopRatings(limit);
  }

  private calculateNewRating(currentRating: number, points: number): number {
    return Math.max(0, currentRating + points);
  }
}
