import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.notification.findMany();
  }

  async findByEventId(eventId: string) {
    return this.prisma.notification.findUnique({
      where: { eventId },
    });
  }
}

