import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';
import { GameModule } from './game/game.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    GameModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
