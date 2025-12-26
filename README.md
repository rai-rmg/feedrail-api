# 🚂 FeedRail API

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15_(App_Router)-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-5a67d8)
![QStash](https://img.shields.io/badge/Upstash-QStash-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

**The Open Source, Self-Hosted Social Media Middleware.**

FeedRail is a headless API that unifies social networks (X/Twitter, LinkedIn, Facebook, etc.) into a single, standardized interface. It handles authentication storage, API rate limits, and asynchronous publishing queues for you.

> **Why FeedRail?** Building social integrations is hard. APIs change, tokens expire, and serverless functions time out when uploading video. FeedRail abstracts this complexity behind a standard JSON API.

---

## ⚡ Features

- **Unified JSON API**: Write once, post everywhere.
- **Multi-Tenant & Agency Ready**: Native hierarchy: `User` > `Brands` > `Social Accounts`.
- **Async by Design**: Powered by **Upstash QStash** to handle heavy media uploads and avoid serverless timeouts.
- **Secure Vault**: Access tokens are AES-256 encrypted at rest.
- **Serverless Native**: Built on Next.js 15 API Routes, ready for Vercel, Docker, or VPS.

---

## 🏗 Architecture

FeedRail uses an **Event-Driven Architecture** to ensure reliability.

```mermaid
graph LR
    Client[Your App] -->|POST Payload| API[FeedRail Public API]
    API -->|1. Save Status| DB[(PostgreSQL)]
    API -->|2. Delegate Job| Q[Upstash QStash]
    Q -->|3. Webhook (Async)| Worker[FeedRail Worker]
    Worker -->|4. Decrypt Token| Vault[Crypto Lib]
    Worker -->|5. Publish| Twitter[X / Twitter API]
    Worker -->|5. Publish| LinkedIn[LinkedIn API]
    Worker -->|6. Update Result| DB
```

---

## 🛠 Prerequisites

Before running FeedRail, ensure you have:

* **Node.js 18+** installed.
* **PostgreSQL**: A local instance or a cloud provider (Supabase, Neon, Railway).
* **Upstash Account**: Required for QStash (Message Queue). The free tier is sufficient for development.
* **Ngrok** (or Localtunnel): **Required for local development** to allow QStash to hit your local API.

---

## 🚀 Installation Guide

### 1. Clone the repository

```bash
git clone [https://github.com/your-username/feedrail-api.git](https://github.com/your-username/feedrail-api.git)
cd feedrail-api

```

### 2. Install dependencies

```bash
npm install

```

### 3. Environment Configuration

Duplicate the example file:

```bash
cp .env.example .env

```

Open `.env` and configure the variables below.

**Database & Security:**

```env
# PostgreSQL Connection String
DATABASE_URL="postgresql://user:pass@localhost:5432/feedrail?schema=public"

# 32-byte Encryption Key for Token Storage (AES-256)
# Generate one via terminal: openssl rand -hex 32
ENCRYPTION_KEY="CHANGE_ME_TO_A_REAL_32_BYTE_HEX_KEY"

```

**Upstash QStash (Get these from [Upstash Console](https://console.upstash.com/)):**

```env
QSTASH_URL="[https://qstash.upstash.io/v2/publish/](https://qstash.upstash.io/v2/publish/)..."
QSTASH_TOKEN="..."
QSTASH_CURRENT_SIGNING_KEY="..."
QSTASH_NEXT_SIGNING_KEY="..."

```

**App Configuration:**

```env
# CRITICAL FOR LOCAL DEV:
# QStash cannot call "localhost". You must use Ngrok.
APP_URL="[https://your-ngrok-id.ngrok-free.app](https://your-ngrok-id.ngrok-free.app)"

```

### 4. Database Setup

Initialize the database schema with Prisma:

```bash
npx prisma db push

```

### 5. Start Local Server (with Tunneling)

Since we use Webhooks/Queues, standard `localhost:3000` is not enough.

1. **Start Next.js:**
```bash
npm run dev

```


2. **Start Ngrok** (in a separate terminal):
```bash
ngrok http 3000

```


3. **Update .env:**
Copy the Ngrok URL (e.g., `https://a1b2.ngrok-free.app`) and paste it into `APP_URL` in your `.env` file. Restart the Next.js server if needed.

---

## 📂 Project Structure

```bash
feedrail-api/
├── prisma/
│   └── schema.prisma     # Database Schema (User, Brand, Post)
├── lib/
│   ├── prisma.ts         # DB Client Singleton
│   ├── crypto.ts         # AES-256 Encryption logic
│   ├── queue.ts          # QStash Client
│   └── providers/        # THE "RAILS" (Social Adapters)
│       ├── interface.ts  # Standard Interface
│       ├── factory.ts    # Adapter Selector
│       └── twitter.ts    # Twitter Implementation
├── app/
│   └── api/
│       ├── v1/
│       │   ├── auth/     # OAuth Connect & Callbacks
│       │   ├── posts/    # Public API (Producer)
│       └── workers/      # Private API (Consumer / QStash Handler)

```

---

## 🔌 API Documentation

FeedRail is designed for Multi-Tenant use (Agencies/SaaS).
**Hierarchy:** `User` (Developer) -> `Brand` (End Client) -> `SocialAccount`.

### 1. Connect a Social Account

*Since FeedRail is headless, you request an auth URL and redirect your user.*

**Request:**
`GET /api/v1/auth/connect?provider=twitter&brandId=YOUR_BRAND_ID`

**Response:**

```json
{ "url": "[https://twitter.com/i/oauth2/authorize?response_type=code](https://twitter.com/i/oauth2/authorize?response_type=code)&..." }

```

*User flow: Your App -> FeedRail Auth URL -> Social Network -> FeedRail Callback -> Your App.*

### 2. Publish a Post

Send a single request to post to multiple platforms for a specific brand.

**Endpoint:** `POST /api/v1/posts`
**Headers:** `x-api-key: YOUR_USER_API_KEY`

**Body:**

```json
{
  "brandId": "br_clq123...",
  "platforms": ["twitter", "linkedin"],
  "content": "Hello world! This is posted via FeedRail 🚂",
  "mediaUrls": ["[https://example.com/image.jpg](https://example.com/image.jpg)"]
}

```

**Response (Immediate):**

```json
{
  "success": true,
  "data": {
    "id": "post_789",
    "status": "queued",
    "message": "Post has been scheduled for processing."
  }
}

```

### 3. Check Post Status

Since processing is asynchronous, poll this endpoint or use Webhooks (Coming Soon).

**Endpoint:** `GET /api/v1/posts/[id]`

**Response:**

```json
{
  "id": "post_789",
  "status": "COMPLETED",
  "results": {
    "twitter": { "id": "123", "url": "[https://twitter.com/](https://twitter.com/)..." },
    "linkedin": { "error": "Token expired" }
  }
}

```

---

## 🤝 Contributing

We want to support **every** social platform. We welcome Pull Requests!

**How to add a new "Rail" (Adapter):**

1. Create `lib/providers/yourplatform.ts`.
2. Implement the `ISocialProvider` interface (see `lib/providers/interface.ts`).
3. Register it in `lib/providers/factory.ts`.
4. Submit a PR!

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

```

```