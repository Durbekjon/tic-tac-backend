import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  findByChatId(chatId: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { chatId } });
  }
  findById(userId: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  createUser(user: any): Promise<User> {
    return this.prisma.user.create({ data: user });
  }
  updateUser(userId: string, user: any): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: user });
  }
}
