import { SupportTicket } from '@prisma/client';

export class CreateSupportTicketResponseDto {
  success: boolean;
  data: SupportTicket | null;
}
