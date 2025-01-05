import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RatingRepository } from './rating.repository';

@Module({
  providers: [RatingService, RatingRepository, PrismaService],
  exports: [RatingService, RatingRepository],
})
export class RatingModule {}
