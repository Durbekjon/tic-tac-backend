import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';

@Controller({ path: 'user' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query('app_key') appKey: string) {
    return await this.userService.findAll(appKey);
  }

  @Get(':chatId')
  async findByChatId(
    @Param('chatId') chatId: string,
    @Query('app_key') appKey: string,
  ) {
    return await this.userService.findByChatId(appKey, chatId);
  }

  @Post()
  async create(@Query('app_key') appKey: string, @Body() user: any) {
    return await this.userService.createUser(appKey, user);
  }

  @Patch(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Query('app_key') appKey: string,
    @Body() user: any,
  ) {
    return await this.userService.updateUser(appKey, userId, user);
  }
}
