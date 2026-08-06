# Mailico

A Gmail-style mail client that sends email through [Resend](https://resend.com) from any address on the `mail.darvizlabs.online` domain.

## Features

- Gmail-like interface: sidebar, email list, reading pane, search, starring, drafts, trash.
- Compose with **To**, **Cc** and **Bcc** recipient fields (chip inputs, comma/Enter to add).
- **From** field: type any local part (e.g. `john`), it always sends as `<local>@mail.darvizlabs.online`. The domain is enforced on the server — requests with any other sender domain are rejected.
- Drafts auto-save while you compose (localStorage) and can be reopened to edit.
- Sent emails are recorded locally so you can review them in **Sent**.

## Setup

1. Verify the `mail.darvizlabs.online` domain in [Resend](https://resend.com/domains) and add the required DNS records.
2. Create a [Resend API key](https://resend.com/api-keys) and put it in `.env.local`:

   ```
   RESEND_API_KEY=re_xxxxxxxx
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000, press **Compose**, pick a sender name, add recipients and send.

## Sending API

`POST /api/send`

```json
{
  "from": "sales@mail.darvizlabs.online",
  "to": ["customer@example.com"],
  "cc": ["boss@example.com"],
  "bcc": ["audit@example.com"],
  "subject": "Hello",
  "body": "Plain text body"
}
```

Server-side rules:

- `from` must end with `@mail.darvizlabs.online` (the local part is validated too).
- At least one `to` recipient is required; recipients are basic email validated.
- `replyTo` is set to the sender so replies land back on the custom address.

## Storage note

Sent/draft/read/star state is kept in `localStorage` for this demo. Incoming mail is not fetched — Resend is used for sending only (an inbound webhook could be added later).
