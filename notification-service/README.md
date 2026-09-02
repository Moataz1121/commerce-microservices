# NestJS Notification Service

The **Notification Service** consumes asynchronous events from RabbitMQ, logs notifications in PostgreSQL database `commerce_notifcations` with idempotency protection, and renders HTML templates to send transactional emails via Mailtrap.

---

## 🛠️ Stack & Configuration

* **Framework**: NestJS
* **Database**: PostgreSQL database `commerce_notifcations` via Prisma ORM
* **AMQP Library**: `amqplib`
* **Email Transport**: `nodemailer` with Mailtrap SMTP
* **Default Port**: `3000`

---

## 📥 Event Consumption

The `RabbitMQService` listens to the `commerce_events` exchange (`topic`) and consumes from two durable queues:

1. **`notification_user_registered`** (Routing key: `user.registered`)
   - Triggers `NotificationsService.handleUserRegistered`
   - Renders `src/mail/templates/welcome.html`
   - Sends Welcome Email via Mailtrap.

2. **`notification_order_created`** (Routing key: `order.created`)
   - Triggers `NotificationsService.handleOrderCreated`
   - Renders `src/mail/templates/order-created.html`
   - Sends Order Confirmation Email via Mailtrap.

---

## 🔒 Idempotency & Database Tracking

Every consumed event is checked against the database before processing:
1. `prisma.notification.findUnique({ where: { eventId } })`
2. If the `eventId` already exists, execution skips immediately to prevent duplicate email deliveries.
3. Initial record is created with `status: PENDING`.
4. Upon successful Mailtrap SMTP transport, record status updates to `SENT` with `sentAt` timestamp and `providerMessageId`.
5. On error, record status updates to `FAILED` with `errorMessage` and incremented `attempts`.

---

## ⚙️ Environment Configuration (`.env`)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/commerce_notifcations"
PORT=3000

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/

MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=790745a55a8fc3
MAIL_PASSWORD=03abe12afdc357
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="Commerce Microservices"
```

---

## 🏃 Running the Service

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init_notifications

# Build project
npm run build

# Start development server
npm run start:dev
```
