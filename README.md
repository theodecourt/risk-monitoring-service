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

<img width="1098" height="452" alt="image" src="https://github.com/user-attachments/assets/3cf2f8a1-f6f7-466c-8abf-28305da3e339" />

# Getting Started

## This project is built with TypeScript and Node.js. It is cross-platform and works on Windows (PowerShell/CMD), macOS, and Linux.

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

3. Create a ```.env``` file in the root directory and paste the provided credentials:

