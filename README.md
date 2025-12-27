# 🚂 FeedRail API

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16_(App_Router)-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-5a67d8)
![QStash](https://img.shields.io/badge/Upstash-QStash-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

**The Open Source, Self-Hosted Social Media Middleware.**

FeedRail is a headless API that unifies social networks (currently Meta/Facebook and Instagram) into a single, standardized interface. It handles authentication storage, API rate limits, and asynchronous publishing queues for you.

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

**Note:** Currently, only Meta (Facebook and Instagram) platforms are implemented. Support for Twitter, LinkedIn, and others is planned for future releases.

---

## 🛠 Prerequisites

Before running FeedRail, ensure you have:

- **Node.js 18+** installed.
- **PostgreSQL**: A local instance or a cloud provider (Supabase, Neon, Railway).
- **Upstash Account**: Required for QStash (Message Queue). The free tier is sufficient for development.
- **Ngrok** (or Localtunnel): **Required for local development** to allow QStash to hit your local API.
- **Meta App**: Required for connecting Facebook and Instagram accounts. See setup instructions below.

### Meta App Setup

To enable Facebook and Instagram integrations, you need to create a Meta app and configure it for API access:

1. Go to [Meta for Developers](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **"My Apps"** > **"Create App"**.
3. Choose **"Business"** as the app type (or "Consumer" if you prefer).
4. Select **"None"** for business account (or link if you have one).
5. Enter your app name (e.g., "FeedRail API") and contact email.
6. Once created, go to **App Settings** > **Basic** to get your **App ID** and **App Secret**.
7. Add the **Facebook Login** product:
   - Go to **Products** > **Facebook Login** > **Settings**.
   - Add your redirect URI: `https://your-ngrok-id.ngrok-free.app/api/v1/social-accounts/callback` (replace with your actual Ngrok URL).
8. For Instagram support, add the **Instagram Basic Display** product and configure permissions.
9. Request permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` (review process may apply).
10. Copy the **App ID**, **App Secret**, and **Redirect URI** to your `.env` file.

**Note:** Meta apps require review for production use. For development, some permissions may work without review.

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

**Meta/Facebook API (For social account connections):**

```env
META_APP_ID="your_meta_app_id"
META_APP_SECRET="your_meta_app_secret"
META_REDIRECT_URI="https://your-ngrok-id.ngrok-free.app/api/v1/social-accounts/callback"
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
npx prisma migrate dev --name init
```

If you have existing migrations, apply them:

```bash
npx prisma migrate deploy
```

### 5. Seed the Database (Optional)

Populate the database with sample data:

```bash
npm run seed
```

### 6. Start Local Server (with Tunneling)

Since we use Webhooks/Queues, standard `localhost:3000` is not enough.

1. **Start Next.js:**

```bash
npm run dev

```

1. **Start Ngrok** (in a separate terminal):

```bash
ngrok http 3000

```

1. **Update .env:**
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
│   └── rails/            # THE "RAILS" (Social Adapters)
│       ├── interface.ts  # Standard Interface
│       ├── factory.ts    # Adapter Selector
│       └── meta.ts       # Meta (Facebook/Instagram) Implementation
├── app/
│   └── api/
│       ├── v1/
│       │   ├── brands/   # Brand Management
│       │   ├── posts/    # Public API (Producer)
│       │   ├── social-accounts/ # Social Account Connections
│       └── workers/      # Private API (Consumer / QStash Handler)

```

---

## � Available Scripts

After installation, you can run the following commands:

- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint to check code quality.
- `npm run seed`: Seed the database with initial data.

---

## �🔌 API Documentation

FeedRail is designed for Multi-Tenant use (Agencies/SaaS).
**Hierarchy:** `User` (Developer) -> `Brand` (End Client) -> `SocialAccount`.

**Authentication:** All API requests require an `x-api-key` header with your User API key.

### 1. Create a Brand

Create a new brand for organizing social accounts and posts.

**Endpoint:** `POST /api/v1/brands`
**Headers:** `x-api-key: YOUR_USER_API_KEY`

**Body:**

```json
{
  "name": "My Brand",
  "clientRefId": "optional-client-reference"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "br_clq123...",
    "name": "My Brand",
    "clientRefId": "optional-client-reference",
    "userId": "user_123"
  }
}
```

### 2. Connect a Social Account

Connect a Meta (Facebook/Instagram) account to a brand via OAuth.

**Endpoint:** `POST /api/v1/social-accounts`
**Headers:** `x-api-key: YOUR_USER_API_KEY`

**Body:**

```json
{
  "provider": "facebook",
  "code": "oauth_code_from_meta",
  "brandId": "br_clq123..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "sa_123",
    "provider": "facebook",
    "platformId": "page_id",
    "brandId": "br_clq123..."
  }
}
```

### 3. Publish a Post

Send a single request to post to multiple platforms for a specific brand.

**Endpoint:** `POST /api/v1/posts`
**Headers:** `x-api-key: YOUR_USER_API_KEY`

**Body:**

```json
{
  "brandId": "br_clq123...",
  "platforms": ["facebook", "instagram"],
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
    "facebook": { "id": "123", "url": "https://facebook.com/..." },
    "instagram": { "error": "Token expired" }
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
