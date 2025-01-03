import { Body, Controller, Post, Query } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ApiResponse } from '@nestjs/swagger';
import { CreateSupportTicketResponseDto } from './dto/create-support-ticket-response.dto';

@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('/ticket')
  @ApiResponse({ status: 200, type: CreateSupportTicketResponseDto })
  createSupportTicket(
    @Body() data: CreateSupportTicketDto,
    @Query('app_key') appKey: string,
  ) {
    return this.supportService.createSupportTicket(appKey, data);
  }
}
