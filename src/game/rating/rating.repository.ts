import { Injectable } from '@nestjs/common';

@Injectable()
export class RatingRepository {
  private ratings = new Map<string, number>();

  async getRating(userId: string): Promise<number> {
    return this.ratings.get(userId) || 0;
  }

  async updateRating(userId: string, newRating: number): Promise<void> {
    this.ratings.set(userId, newRating);
  }

  async getTopRatings(limit: number): Promise<any[]> {
    return Array.from(this.ratings.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, rating]) => ({ userId, rating }));
  }
}
