import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  findByChatId(chatId: string) {
    return this.prisma.user.findUnique({ where: { chatId } });
  }

  createUser(user: any): Promise<User> {
    return this.prisma.user.create({ data: user });
  }
  updateUser(userId: string, user: any): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: user });
  }
}
