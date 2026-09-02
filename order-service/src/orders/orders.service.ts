import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { CreateOrderDto } from './dto/create-order.dto';
import * as crypto from 'crypto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Create an order and publish OrderCreated event to RabbitMQ.
   */
  async create(dto: CreateOrderDto) {
    // 1. Create order in PostgreSQL
    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId,
        userEmail: dto.email,
        total: dto.total,
        status: 'CREATED',
      },
    });

    this.logger.log(`Order #${order.id} created successfully in database.`);

    // 2. Publish OrderCreated event only after DB creation succeeds
    const eventPayload = {
      eventId: crypto.randomUUID(),
      event: 'order.created',
      version: 1,
      data: {
        orderId: order.id,
        userId: order.userId,
        email: order.userEmail,
        total: order.total,
      },
    };

    await this.rabbitMQService.publish('commerce_events', 'order.created', eventPayload);

    return order;
  }

  /**
   * Find all orders.
   */
  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find single order by ID.
   */
  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    return order;
  }
}
