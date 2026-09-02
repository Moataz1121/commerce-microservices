import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificationsService, UserRegisteredPayload, OrderCreatedPayload } from '../notifications/notifications.service';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }

  private async connect() {
    try {
      const host = this.configService.get<string>('RABBITMQ_HOST', 'localhost');
      const port = this.configService.get<number>('RABBITMQ_PORT', 5672);
      const user = this.configService.get<string>('RABBITMQ_USER', 'guest');
      const password = this.configService.get<string>('RABBITMQ_PASSWORD', 'guest');
      const vhost = this.configService.get<string>('RABBITMQ_VHOST', '/');

      const url = `amqp://${user}:${password}@${host}:${port}${vhost === '/' ? '' : vhost}`;

      this.logger.log(`Connecting to RabbitMQ at ${host}:${port}...`);
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      const exchange = 'commerce_events';
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Setup user.registered queue
      const userQueue = 'notification_user_registered';
      await this.channel.assertQueue(userQueue, { durable: true });
      await this.channel.bindQueue(userQueue, exchange, 'user.registered');

      // Setup order.created queue
      const orderQueue = 'notification_order_created';
      await this.channel.assertQueue(orderQueue, { durable: true });
      await this.channel.bindQueue(orderQueue, exchange, 'order.created');

      this.logger.log(`Subscribed to queues "${userQueue}" and "${orderQueue}" on exchange "${exchange}"`);

      // Consume user.registered queue
      await this.channel.consume(userQueue, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString()) as UserRegisteredPayload;
          this.logger.log(`Received event "${payload.event}" (eventId: ${payload.eventId})`);
          if (payload.event === 'user.registered') {
            await this.notificationsService.handleUserRegistered(payload);
          }
          this.channel.ack(msg);
        } catch (err) {
          this.logger.error('Error processing user.registered message:', err);
          this.channel.ack(msg);
        }
      });

      // Consume order.created queue
      await this.channel.consume(orderQueue, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString()) as OrderCreatedPayload;
          this.logger.log(`Received event "${payload.event}" (eventId: ${payload.eventId})`);
          if (payload.event === 'order.created') {
            await this.notificationsService.handleOrderCreated(payload);
          }
          this.channel.ack(msg);
        } catch (err) {
          this.logger.error('Error processing order.created message:', err);
          this.channel.ack(msg);
        }
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }
}
