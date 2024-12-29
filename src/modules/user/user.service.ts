import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { UserRepository } from './user.repository';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface ValidatedAppKey {
  app: string;
  key: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async findAll(appKey: string) {
    await this.validateAppKey(appKey);
    return this.userRepository.findAll();
  }

  async findByChatId(appKey: string, chatId: string) {
    await this.validateAppKey(appKey);

    if (!chatId || chatId === '') {
      throw new BadRequestException('Chat id is required');
    }
    const user = await this.userRepository.findByChatId(chatId);
    if (!user) {
      throw new NotFoundException(`User with chatId ${chatId} not found`);
    }
    return user;
  }

  async createUser(appKey: string, user: Prisma.UserCreateInput) {
    await this.validateAppKey(appKey);
    return this.userRepository.createUser({
      ...user,
    });
  }

  async updateUser(
    appKey: string,
    userId: string,
    user: Prisma.UserUpdateInput,
  ) {
    await this.validateAppKey(appKey);
    const existingUser = await this.userRepository.findByChatId(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return this.userRepository.updateUser(userId, {
      ...user,
    });
  }

  private async validateAppKey(appKey: string): Promise<ValidatedAppKey> {
    if (!appKey || appKey === '') {
      throw new BadRequestException('App key is required');
    }

    const keys = this.configService.get<string>('KEYS');
    const parsedKeys: { app: string; key: string }[] = JSON.parse(keys);

    const key = parsedKeys.find((key) => key.key === appKey);

    if (!key) {
      throw new BadRequestException('Invalid app key');
    }

    return key;
  }
}
