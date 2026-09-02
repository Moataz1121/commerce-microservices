import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export interface UserRegisteredPayload {
  eventId: string;
  event: string;
  version: number;
  data: {
    userId: number | string;
    email: string;
    name: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Handle user.registered event with idempotency check and Mailtrap delivery.
   */
  async handleUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    const { eventId, data } = payload;
    const { email, name } = data;

    // 1. Idempotency Check
    const existing = await this.prisma.notification.findUnique({
      where: { eventId },
    });

    if (existing) {
      this.logger.warn(`Event ${eventId} has already been processed. Skipping.`);
      return;
    }

    const subject = 'Welcome to our platform!';
    const template = 'welcome';

    // 2. Save initial PENDING notification record in DB
    const notification = await this.prisma.notification.create({
      data: {
        eventId,
        type: 'user.registered',
        recipient: email,
        subject,
        template,
        status: 'PENDING',
        provider: 'mailtrap',
      },
    });

    try {
      // 3. Send email using MailService
      const messageId = await this.mailService.sendWelcomeEmail(email, name);

      // 4. Update status to SENT
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: messageId,
        },
      });

      this.logger.log(`Notification ${notification.id} sent successfully for event ${eventId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email for event ${eventId}: ${errorMessage}`);

      // 5. Update status to FAILED
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          errorMessage,
          attempts: { increment: 1 },
        },
      });
    }
  }

  async findAll() {
    return this.prisma.notification.findMany();
  }

  async findByEventId(eventId: string) {
    return this.prisma.notification.findUnique({
      where: { eventId },
    });
  }
}
