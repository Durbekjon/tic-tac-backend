import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../user/user.repository';

@Module({
  controllers: [SupportController],
  providers: [
    SupportService,
    SupportRepository,
    PrismaService,
    UserRepository,
    ConfigService,
  ],
})
export class SupportModule {}
