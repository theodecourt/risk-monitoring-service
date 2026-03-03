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

## Key Design Choices

- **Idempotency:** The `POST /monitors` endpoint uses a PostgreSQL `ON CONFLICT` clause. This ensures that duplicate requests for the same URL update existing settings rather than creating redundant jobs.
- **Concurrency Control:** Locally, `fastq` limits the worker to 2 simultaneous scans. This simulates the "reserved concurrency" of an AWS Lambda, protecting the system from CPU/Network exhaustion.
- **Observability:** By separating `executions` from `monitors`, we create a full audit trail. Even failed scans are recorded with `error_message`, allowing for easier debugging and customer transparency.
- **Latency vs. Cost:** We chose a static scraper (Cheerio) as the primary engine. It is 10x faster and cheaper to run than a headless browser (Puppeteer), making it the ideal "First-Pass" filter before escalating to more expensive AI or browser-based tools.

# Getting Started

#### This project is built with TypeScript and Node.js. It is cross-platform and works on Windows (PowerShell/CMD), macOS, and Linux.

### 1. Prerequisites

- Node.js: v18.x or higher

- npm: v9.x or higher

### 2. Installation

1. Clone the repository.

2. Install dependencies:

```
npm install
```

### 3. Configure Environment:

**macOS / Linux:**
```
cp .env.example .env
```

**Windows (PowerShell):**
```
copy .env.example .env
```

⚠️ IMPORTANT

Database Connection: After creating the .env file, open it and replace the DATABASE_URL placeholder with the connection string provided in the submission message. This will connect the project to our pre-configured Supabase instance, allowing you to see historical scan data and active alerts immediately.

### 4. Running the Project

Once the ```.env``` file is configured with the provided ```DATABASE_URL```, you can start the system.

**Development Mode**

```
npm run dev
```

**Production Build**

```
npm run build
npm start
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

The system employs a Weighted Risk Scoring model designed to minimize false positives while identifying coordinated illicit content. Rather than a binary "yes/no" keyword check, it evaluates the cumulative context of a page.

1. Weighted Scoring Model

An alert is only triggered if the aggregate Risk Score crosses a threshold of 60 points. This prevents a single mention of a word from triggering a false alarm.

| Severity    | Keywords                         | Weight        |
|-------------|----------------------------------|---------------|
| Critical    | Explosives, Weapons, Guns        | 40 - 50 pts   |
| High        | Narcotics, Drugs                 | 30 - 40 pts   |
| Contextual  | Telegram, Buy, Cannabis          | 10 - 20 pts   |

- Image Heuristics: Keywords found in image metadata (alt, title, or src) contribute 50% of their weight to the total score. This acknowledges that filenames provide high-signal intent but should be validated by page context.

2. Multi-Vector Analysis

The worker analyzes the following HTML vectors to ensure comprehensive coverage:

- Regex-Based Fuzzy Matching: To bypass obfuscation (e.g., g.u.n.s or d r u g s), the system uses dynamic regular expressions to identify target words regardless of common separator characters.

- Metadata Extraction: Scans accessibility alt tags, hover title attributes, and raw image filenames.

- Textual DOM Analysis: Performs a full-body scan of the rendered text content.

- Anti-Bot Protection: Implements rotated, high-reputation User-Agent headers to simulate legitimate browser traffic and bypass basic firewall blocks.

#### Known Limitations

Client-Side Rendering (CSR): The current scraper (Axios + Cheerio) does not execute JavaScript. Content rendered dynamically (SPAs) may not be fully scanned.

# Scalability & Future Improvements

- Headless Browsing: Replace Axios with Puppeteer/Playwright to handle JavaScript-heavy sites.

- Computer Vision: Pass extracted image URLs to Amazon Rekognition for pixel-level weapon/drug detection.

- AI-Powered Semantic Analysis: Replace or augment regex matching with an LLM (e.g., Gemini API or OpenAI) to perform Sentiment and Intent Analysis. This allows the system to distinguish between a historical article about "firearms" (educational/safe) and a storefront illegally selling "weapons" (risky), significantly reducing false positives.

- Distributed Workers: In a production environment, the internal fastq queue would be replaced by Amazon SQS, allowing the Worker to scale horizontally as independent Lambda functions.

