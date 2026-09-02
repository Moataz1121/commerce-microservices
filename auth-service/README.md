# Laravel Auth Service

The **Auth Service** handles user registration, authentication, JWT issuing, user profiles, and event publishing upon successful registration.

---

## 🛠️ Stack & Configuration

* **Framework**: Laravel 12 (PHP 8.4)
* **Authentication**: JWT (`php-open-source-saver/jwt-auth`)
* **Database**: PostgreSQL database `commerce_auth`
* **AMQP Library**: `php-amqplib/php-amqplib`
* **Default Port**: `8000`

---

## 📡 Key Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user & publish `user.registered` event | No |
| `POST` | `/api/auth/login` | Authenticate user credentials & return JWT access token | No |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile | Yes (Bearer Token) |
| `POST` | `/api/auth/logout` | Invalidate current JWT access token | Yes (Bearer Token) |

---

## 📦 Event Publishing

When a user registers via `POST /api/auth/register`, `App\Services\AuthService` delegates event publishing to `App\Messaging\RabbitMQPublisher`.

### `user.registered` Event Payload
```json
{
  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "event": "user.registered",
  "version": 1,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "name": "Moataz"
  }
}
```
* **Exchange**: `commerce_events` (`topic`)
* **Routing Key**: `user.registered`

---

## ⚙️ Environment Configuration (`.env`)

```env
APP_NAME=Laravel
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=commerce_auth
DB_USERNAME=user
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret_here
JWT_ALGO=HS256

RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
```

---

## 🏃 Running the Service

```bash
# Install PHP dependencies
composer install

# Generate application key and JWT secret
php artisan key:generate
php artisan jwt:secret

# Run migrations
php artisan migrate

# Start development server
php artisan serve --port=8000
```
