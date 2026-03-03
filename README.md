# Periodic Website Risk Monitoring System

An event-driven, scalable system designed to monitor websites for risky content (e.g., weapons, drugs, and illicit materials) using metadata heuristics and an asynchronous worker architecture.

# Architecture Overview

This project follows an Event-Driven Architecture (EDA) designed for high concurrency and decoupling.

## Local Architecture vs. AWS Cloud Mapping

The system is built to be "Cloud-Ready." Here is how the local implementation maps to a production AWS environment:

| Local Component | Implementation | AWS Production Equivalent |
|-----------------|----------------|--------------------------|
| API Service | Fastify (Node.js) | Amazon API Gateway + AWS Lambda |
| Database | PostgreSQL (Supabase) | Amazon RDS (PostgreSQL) |
| Scheduler | node-cron | Amazon EventBridge |
| Task Queue | fastq (In-memory) | Amazon SQS |
| Worker | Cheerio/Axios Scraper | AWS Lambda |
| Notification | Mock Service (Console) | Amazon SES (Email) |

# System Diagram

<img width="1100" height="458" alt="image" src="https://github.com/user-attachments/assets/0d8735af-a939-4d44-865f-44e6a1d71dca" />

# Getting Started

#### This project is built with TypeScript and Node.js. It is cross-platform and works on Windows (PowerShell/CMD), macOS, and Linux.

### 1. Prerequisites

- Node.js: v18.x or higher

- npm: v9.x or higher

- Supabase/Postgres: A running PostgreSQL instance (Supabase recommended).

### 2. Installation

1. Clone the repository.

2. Install dependencies:

```
npm install
```

3. Configure Environment:
Run the following command to set up your environment variables (this will connect you to our pre-configured Supabase instance):

**macOS / Linux:**
```
cp .env.example .env
```

**Windows (PowerShell):**
```
copy .env.example .env
```

# API Documentation

```
POST /monitors
```

Create or update a monitor. This route is Idempotent; posting an existing URL will update its frequency and re-activate it.

**Body:**

```
{ "url": "string", "frequency_seconds": number, "customer_email": "string" }
```

```
GET /monitors
```

Returns a list of all configured monitors.

```
GET /monitors/:id
```

Returns detailed information about a monitor, including the latest 5 scan results from the execution history.

```
DELETE /monitors/:id
```

Deletes a monitor and its associated execution/alert history.

# Detection Logic & Heuristics

