import { Logger, Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';
import { GameModule } from './game/game.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    GameModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupportModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
