import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificationsService, UserRegisteredPayload } from '../notifications/notifications.service';

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
      const queue = 'notification_user_registered';
      const routingKey = 'user.registered';

      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);

      this.logger.log(`Subscribed to queue "${queue}" bound to exchange "${exchange}" with routing key "${routingKey}"`);

      await this.channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const content = msg.content.toString();
          const payload = JSON.parse(content) as UserRegisteredPayload;

          this.logger.log(`Received event "${payload.event}" (eventId: ${payload.eventId})`);

          if (payload.event === 'user.registered') {
            await this.notificationsService.handleUserRegistered(payload);
          } else {
            this.logger.warn(`Unhandled event type: ${payload.event}`);
          }

          this.channel.ack(msg);
        } catch (err) {
          this.logger.error('Error processing RabbitMQ message:', err);
          // Acknowledge to prevent message loop during dev/testing
          this.channel.ack(msg);
        }
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }
}
