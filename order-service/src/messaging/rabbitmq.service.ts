import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;

  constructor(private readonly configService: ConfigService) {}

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

      await this.channel.assertExchange('commerce_events', 'topic', { durable: true });
      this.logger.log('RabbitMQ publisher channel initialized');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }

  /**
   * Publish an event payload to RabbitMQ.
   */
  async publish(exchange: string, routingKey: string, payload: Record<string, any>): Promise<void> {
    try {
      if (!this.channel) {
        this.logger.warn('RabbitMQ channel not initialized. Attempting reconnect...');
        await this.connect();
      }

      const content = Buffer.from(JSON.stringify(payload));
      this.channel.publish(exchange, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
      });

      this.logger.log(`Published event "${routingKey}" to exchange "${exchange}" (eventId: ${payload.eventId})`);
    } catch (error) {
      this.logger.error(`Failed to publish event "${routingKey}":`, error);
    }
  }
}
