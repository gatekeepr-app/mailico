# Next.js PWA Starter Kit

Welcome to the Next.js PWA Starter Kit! This starter kit provides a foundation for building Progressive Web Apps (PWAs) using Next.js and the `Serwist` plugin.

## Features

- **Next.js**: The React framework for production.
- **PWA support**: Add offline capabilities and improve the performance of your app with `Serwist`.
- **Tailwind CSS** : A utility-first CSS framework packed with classes
- **TypeScript**: Optional, strongly typed language that builds on JavaScript.
- **ESLint**: Linting for JavaScript and TypeScript.
- **Prettier**: Code formatter to ensure consistent code style.

## Getting Started

To get started with this starter kit, follow these steps:

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (>= 20.0.0)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### Installation

1. Clone this repository:

   ```sh
   git clone https://github.com/hariadiarief/next-pwa-starter-kit.git
   cd next-pwa-starter-kit
   ```

2. Install the dependencies:

   ```sh
   yarn install
   # or
   npm install
   ```

### Development

To start the development server, run:

```sh
yarn dev
# or
npm run dev
```

## Chat webhooks (Slack)

Mailico can ingest incoming Slack messages via a webhook endpoint.

### Endpoint

```
POST /api/chat/webhooks/slack/:integrationId
```

### Required environment variables

### Create a Slack integration

```
POST /api/chat/integrations/slack
```

Body:

```
{
  "signingSecret": "...",
  "teamId": "T0123ABC" // optional
}
```

Response:

```
{
  "ok": true,
  "integrationId": "...",
  "webhookUrl": "https://your-app.com/api/chat/webhooks/slack/..."
}
```

### Required environment variables

- `CREDENTIALS_SECRET` - Encryption key for stored signing secrets.
- `CONVEX_ADMIN_SECRET` - Required for server-side ingestion into Convex.
- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` - Convex endpoint for server client.

### Notes

- Slack URL verification is handled automatically.
- Events are stored as chat conversations and chat messages for later automation.

## Payments (UddoktaPay)

Billing uses UddoktaPay for checkout and verification.

### Endpoints

```
POST /api/payments/uddokta/create
POST /api/payments/uddokta/verify
POST /api/payments/uddokta/webhook
```

### Required environment variables

- `UDDOKTAPAY_API_KEY`
- `UDDOKTAPAY_BASE_URL` (optional, defaults to https://gatekeepr.paymently.io/api)
- `CONVEX_ADMIN_SECRET`
- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`
