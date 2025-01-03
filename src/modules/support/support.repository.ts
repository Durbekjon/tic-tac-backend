import { Injectable } from '@nestjs/common';
import { Prisma, SupportTicket } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSupportTicket(data: any): Promise<SupportTicket> {
    return this.prisma.supportTicket.create({ data });
  }
  updateSupportTicket(ticketId: string, data: any): Promise<SupportTicket> {
    const where = { id: ticketId };
    return this.prisma.supportTicket.update({ where, data });
  }

  createSupportResponse(data: any) {
    return this.prisma.supportResponse.create({ data });
  }
}
