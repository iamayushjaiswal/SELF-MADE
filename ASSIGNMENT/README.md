# API Export — Buyer Outreach Platform (MERN)

Export lead generation platform for the **API EXPORT** internship assessment. Discover international buyers via API, validate contacts, send Gmail outreach campaigns, and track results.

## Features

- **Buyer Discovery** — API-based lead generation by category, country, and market segment
- **Lead Management** — Add, import/export CSV, filter, and organize buyer records
- **Email Validation** — Format + MX record verification
- **Duplicate Prevention** — Automatic duplicate detection and logging
- **AI Classification** — Rule-based + optional OpenAI contact classification
- **Gmail Outreach** — Send single or campaign emails via Gmail SMTP
- **Analytics Dashboard** — Funnel, country breakdown, email trends
- **Weekly Reports** — Campaign progress and activity logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Email | Nodemailer (Gmail SMTP) |
| Optional APIs | Hunter.io, OpenAI |

## Setup

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Gmail credentials
npm run dev
```

Server runs on **http://localhost:5001**

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

App runs on **http://localhost:5173**

### 4. Gmail Setup

1. Enable 2FA on your Google account
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Add to `server/.env`:

```
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

## Demo Flow (for screen recording)

1. Open **Discover Buyers** → select category → discover leads via API
2. Go to **Buyer Leads** → click **Validate Emails** → **Check Duplicates**
3. Go to **Campaigns** → create campaign → **Send via Gmail**
4. Check your Gmail **Sent** folder → take screenshots
5. Go to **Email Logs** → mark responses
6. View **Dashboard** and **Weekly Report**

## Submission

Upload to Google Drive:
- Screen recording of the full demo
- Screenshots of sent emails from Gmail
- Set folder to **Anyone with the link**
- Paste link on [HireFlow portal](https://hireflow-xi-two.vercel.app/)

## Project Structure

```
ASSIGNMENT/
├── client/          React frontend
├── server/          Express API + MongoDB
└── README.md
```
