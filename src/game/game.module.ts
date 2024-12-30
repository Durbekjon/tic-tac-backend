import { Logger, Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  providers: [GameGateway, GameService,Logger],
})
export class GameModule {}
