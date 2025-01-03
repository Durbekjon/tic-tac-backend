import { Injectable } from '@nestjs/common';
import { Prisma, SupportTicket } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSupportTicket(
    data: Prisma.SupportTicketCreateInput,
  ): Promise<SupportTicket> {
    return this.prisma.supportTicket.create({ data });
  }
  updateSupportTicket(
    ticketId: string,
    data: Prisma.SupportTicketUpdateInput,
  ): Promise<SupportTicket> {
    const where: Prisma.SupportTicketWhereUniqueInput = { id: ticketId };
    return this.prisma.supportTicket.update({ where, data });
  }

  createSupportResponse(data: Prisma.SupportResponseCreateInput) {
    return this.prisma.supportResponse.create({ data });
  }
}
