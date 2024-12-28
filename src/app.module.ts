import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { GameModule } from './game/game.module';

@Module({
  imports: [GameModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
