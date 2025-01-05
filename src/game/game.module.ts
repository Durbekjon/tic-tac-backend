import { Logger, Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RatingModule } from './rating/rating.module';
import { GameRepository } from './game.repository';
import { RatingService } from './rating/rating.service';
import { PlayerRepository } from './player.repository';

@Module({
  providers: [
    GameGateway,
    GameService,
    RatingService,
    GameRepository,
    PlayerRepository,
    Logger,
  ],
  imports: [RatingModule],
})
export class GameModule {}
