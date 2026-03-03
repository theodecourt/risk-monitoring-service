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

### POST
```
POST /monitors
```

Create or update a monitor. This route is Idempotent; posting an existing URL will update its frequency and re-activate it.

**Body:**

```
{ "url": "string", "frequency_seconds": number, "customer_email": "string" }
```

### GET
```
GET /monitors
```

Returns a list of all configured monitors.

```
GET /monitors/:id
```

Returns detailed information about a monitor, including the latest 5 scan results from the execution history.

### DELETE
```
DELETE /monitors/:id
```

Deletes a monitor and its associated execution/alert history.

# Usage Examples

1. Create a New Monitor

Use this command to start monitoring a website:

```
curl -X POST http://localhost:3000/monitors \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://en.wikipedia.org/wiki/Firearm",
    "frequency_seconds": 60,
    "customer_email": "user@example.com"
  }'
```

2. Check Monitor Status & History

After a few minutes, use the ID returned by the POST request to see the analysis results:

```
# Replace :id with the UUID from the previous step
curl http://localhost:3000/monitors/:id
```

# Database Schema

The system uses a relational PostgreSQL schema designed for auditability and historical tracking.

```
CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  url TEXT NOT NULL,

  frequency_seconds INTEGER NOT NULL,

  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  is_active BOOLEAN DEFAULT true
);

CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,

  status TEXT NOT NULL,
  -- pending | running | completed | failed

  risk_score NUMERIC,
  findings JSONB,

  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,

  severity TEXT,
  message TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```


# Detection Logic & Heuristics

The system uses a weighted metadata heuristic approach:

Metadata Analysis: Scans alt tags, title attributes, and image filenames (src) for risky keywords.

Text Analysis: Scans the DOM body for illicit trade keywords.

Bot Bypass: Implements custom User-Agent headers to bypass basic anti-bot protections.

#### Known Limitations

Client-Side Rendering (CSR): The current scraper (Axios + Cheerio) does not execute JavaScript. Content rendered dynamically (SPAs) may not be fully scanned.

# Scalability & Future Improvements

- Headless Browsing: Replace Axios with Puppeteer/Playwright to handle JavaScript-heavy sites.

- Computer Vision: Pass extracted image URLs to Amazon Rekognition for pixel-level weapon/drug detection.

- AI-Powered Semantic Analysis: Replace or augment regex matching with an LLM (e.g., Gemini API or OpenAI) to perform Sentiment and Intent Analysis. This allows the system to distinguish between a historical article about "firearms" (educational/safe) and a storefront illegally selling "weapons" (risky), significantly reducing false positives.

- Distributed Workers: In a production environment, the internal fastq queue would be replaced by Amazon SQS, allowing the Worker to scale horizontally as independent Lambda functions.

