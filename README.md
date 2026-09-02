# Commerce Microservices Architecture

A microservices repository built with **Laravel**, **NestJS**, **PostgreSQL**, **Prisma**, **RabbitMQ**, **JWT**, and **Mailtrap**.

The goal of this project is to demonstrate real-world backend microservices patterns including database-per-service isolation, asynchronous event-driven messaging, JWT authentication, and transactional email notification handling.

---

## 🏗️ Architecture Overview

The repository contains 3 independent microservices:

```text
commerce-microservices/
│
├── auth-service/          Laravel 12 (Authentication & User Management)
├── order-service/         NestJS (Order Management & Fulfillment)
└── notification-service/  NestJS (Email Notifications & Mailtrap)
```

Each service owns its dedicated PostgreSQL database:
* `commerce_auth` (Laravel Auth Service)
* `commerce_orders` (NestJS Order Service)
* `commerce_notifcations` (NestJS Notification Service)

---

## ⚡ Asynchronous Event Flow

```text
                        CLIENT
                          │
             ┌────────────┴────────────┐
             │                         │
      POST /api/auth/register    POST /orders
             │                         │
             ▼                         ▼
  ┌──────────────────────┐  ┌──────────────────────┐
  │ Laravel Auth Service │  │ Order Service        │
  │ (Port 8000)          │  │ (Port 3001)          │
  └──────────┬───────────┘  └──────────┬───────────┘
             │                         │
      UserRegistered              OrderCreated
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    RabbitMQ     │
                 │ (Exchange:      │
                 │ commerce_events)│
                 └────────┬────────┘
                          │
                          ▼
           ┌─────────────────────────────┐
           │ Notification Service        │
           │ (NestJS - Port 3000)        │
           └──────────────┬──────────────┘
                          │
                    Welcome Email /
                   Order Confirmation
                          │
                          ▼
                     ┌──────────┐
                     │ Mailtrap │
                     └──────────┘
```

---

## 🛠️ Microservices Breakdown

### 1. Laravel Auth Service (`auth-service/`)
* **Framework**: Laravel 12 (PHP 8.4)
* **Database**: PostgreSQL (`commerce_auth`)
* **Port**: `8000`
* **Responsibilities**:
  * User Registration (`POST /api/auth/register`)
  * Login & JWT Token Generation (`POST /api/auth/login`)
  * Authenticated User Profile (`GET /api/auth/me`)
  * Logout (`POST /api/auth/logout`)
  * Event Publisher: Emits `user.registered` event to RabbitMQ upon user registration.

### 2. NestJS Order Service (`order-service/`)
* **Framework**: NestJS (Node.js / TypeScript)
* **Database**: PostgreSQL (`commerce_orders` via Prisma ORM)
* **Port**: `3001`
* **Responsibilities**:
  * Create Order (`POST /orders`)
  * List All Orders (`GET /orders`)
  * Get Order Details (`GET /orders/:id`)
  * Event Publisher: Emits `order.created` event to RabbitMQ upon order creation.

### 3. NestJS Notification Service (`notification-service/`)
* **Framework**: NestJS (Node.js / TypeScript)
* **Database**: PostgreSQL (`commerce_notifcations` via Prisma ORM)
* **Port**: `3000`
* **Responsibilities**:
  * Event Consumer: Listens to `user.registered` and `order.created` routing keys on RabbitMQ.
  * Idempotency Check: Verifies `eventId` against `notifications` database table to prevent duplicate deliveries.
  * Email Dispatch: Uses Nodemailer to send Welcome & Order Confirmation HTML emails via Mailtrap SMTP.

---

## 🚀 Quick Start Guide

### Prerequisites
- PHP >= 8.3 & Composer
- Node.js >= 20 & npm
- PostgreSQL running locally on port `5432` (`user:password@localhost:5432`)
- RabbitMQ running locally on port `5672` (`guest:guest`)

### 1. Database Creation
Ensure the 3 PostgreSQL databases exist locally:
```sql
CREATE DATABASE commerce_auth;
CREATE DATABASE commerce_orders;
CREATE DATABASE commerce_notifcations;
```

### 2. Service Setup

#### Auth Service Setup
```bash
cd auth-service
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate
php artisan serve --port=8000
```

#### Order Service Setup
```bash
cd order-service
npm install
npx prisma migrate dev --name init_orders
npm run start:dev
```

#### Notification Service Setup
```bash
cd notification-service
npm install
npx prisma migrate dev --name init_notifications
npm run start:dev
```

---

## 🧪 Testing the End-to-End Flow

### 1. Register User & Trigger Welcome Email
```bash
curl -i -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"name": "Moataz Test", "email": "user@example.com", "password": "password123"}'
```
* **Result**: `auth-service` creates user and publishes `user.registered` event. `notification-service` consumes the event and sends a Welcome email via Mailtrap.

### 2. Create Order & Trigger Order Confirmation Email
```bash
curl -i -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "email": "user@example.com", "total": 50000}'
```
* **Result**: `order-service` creates order `#1` in PostgreSQL and publishes `order.created` event. `notification-service` consumes the event and sends an Order Confirmation email via Mailtrap.

---

## 📝 License
UNLICENSED / Educational Project.
