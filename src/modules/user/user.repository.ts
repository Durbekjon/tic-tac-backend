import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  findByChatId(chatId: string) {
    return this.prisma.user.findUnique({ where: { chatId } });
  }

  createUser(user: any) {
    return this.prisma.user.create({ data: user });
  }
  updateUser(userId: string, user: any) {
    return this.prisma.user.update({ where: { id: userId }, data: user });
  }
}
