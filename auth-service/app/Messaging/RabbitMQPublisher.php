<?php

namespace App\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Illuminate\Support\Facades\Log;
use Throwable;

class RabbitMQPublisher
{
    /**
     * Publish an event to RabbitMQ.
     *
     * @param string $exchange
     * @param string $routingKey
     * @param array<string, mixed> $messageBody
     * @return void
     */
    public function publish(string $exchange, string $routingKey, array $messageBody): void
    {
        try {
            $connection = new AMQPStreamConnection(
                config('rabbitmq.host'),
                config('rabbitmq.port'),
                config('rabbitmq.user'),
                config('rabbitmq.password'),
                config('rabbitmq.vhost')
            );

            $channel = $connection->channel();

            // Declare topic exchange (durable)
            $channel->exchange_declare($exchange, 'topic', false, true, false);

            $msgJson = json_encode($messageBody, JSON_UNESCAPED_SLASHES);

            $msg = new AMQPMessage($msgJson, [
                'content_type' => 'application/json',
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            ]);

            $channel->basic_publish($msg, $exchange, $routingKey);

            $channel->close();
            $connection->close();

            Log::info("Published event to RabbitMQ", [
                'exchange' => $exchange,
                'routingKey' => $routingKey,
                'eventId' => $messageBody['eventId'] ?? null,
            ]);
        } catch (Throwable $e) {
            Log::error("Failed to publish RabbitMQ event", [
                'error' => $e->getMessage(),
                'exchange' => $exchange,
                'routingKey' => $routingKey,
            ]);
        }
    }
}
