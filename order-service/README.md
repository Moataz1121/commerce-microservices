# NestJS Order Service

The **Order Service** manages order creation, fulfillment queries, order persistence in PostgreSQL via Prisma ORM, and event publishing upon order creation.

---

## 🛠️ Stack & Configuration

* **Framework**: NestJS
* **Database**: PostgreSQL database `commerce_orders` via Prisma ORM
* **AMQP Library**: `amqplib`
* **Default Port**: `3001`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Payload Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders` | Create order & publish `order.created` event | `{ "userId": 15, "email": "customer@example.com", "total": 50000 }` |
| `GET` | `/orders` | Retrieve list of all orders | None |
| `GET` | `/orders/:id` | Retrieve single order details by ID | None |

---

## 📦 Event Publishing

When an order is created via `POST /orders`, `OrdersService` saves the order record to database `commerce_orders` and publishes the event via `RabbitMQService`.

### `order.created` Event Payload
```json
{
  "eventId": "318c6314-080d-46ca-bbf2-ada92a25b3fa",
  "event": "order.created",
  "version": 1,
  "data": {
    "orderId": 1,
    "userId": 15,
    "email": "customer@example.com",
    "total": 50000
  }
}
```
* **Exchange**: `commerce_events` (`topic`)
* **Routing Key**: `order.created`

---

## ⚙️ Environment Configuration (`.env`)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/commerce_orders"
PORT=3001

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
```

---

## 🏃 Running the Service

```bash
# Install node dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init_orders

# Build project
npm run build

# Start development server
npm run start:dev
```
