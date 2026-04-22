<div align="center">

# 🚂 RailInfo

**Real-time Train Information and Live Map for Indian Railways**

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![Netlify](https://img.shields.io/badge/Deployed_on-Netlify-00C7B7?logo=netlify&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Get real-time updates on train schedules, live train locations, and station information across Indian Railways.

</div>

**Status:** This project is under active development and is not production-ready. Use at your own risk; breaking changes may occur.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Frontend](#running-the-frontend)
- [Running the Backend](#running-the-backend)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Architecture Notes](#architecture-notes)
- [Known Limitations & TODOs](#known-limitations--todos)

---

## Features

| Feature                      | Description                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live Train Map**           | Interactive map showing all currently running trains across India with color-coded markers by train type (Rajdhani, Shatabdi, Duronto, Superfast, Express, etc.) |
| **Train Search & Details**   | Search by train number or name. View full schedule, halt times, distances, running days, avg speed, and toggle between data providers                            |
| **Live Running Status**      | Real-time delay data per stop, current location, expected arrival/departure times                                                                                |
| **Station Search & Details** | Search stations by code or name. View live departure/arrival board with platform info, filterable by train type                                                  |
| **Trains Between Stations**  | Find all trains connecting two stations with departure/arrival times, travel duration, and running days                                                          |
| **Redis Caching**            | API responses cached in Redis with configurable TTL for fast repeat queries                                                                                      |
| **Multi-Provider Fallback**  | Data fetched from RailRadar API with automatic fallback to NTES (Indian Railways)                                                                                |
| **Background Scraping**      | Cron-based backend service scrapes and populates train schedules and station metadata                                                                            |

---

## Tech Stack

| Layer               | Technology                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| **Frontend**        | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Leaflet     |
| **Backend Service** | Node.js, TypeScript, node-cron, p-queue, cheerio                           |
| **Database**        | PostgreSQL with Prisma 7 ORM (pg driver adapter)                           |
| **Caching**         | Redis via ioredis                                                          |
| **Data Providers**  | RailRadar API, [NTES (Indian Railways)](https://enquiry.indianrail.gov.in) |
| **Deployment**      | Netlify (frontend), self-hosted (backend service)                          |

---

## Project Structure

```
rail-info/
├── src/                          # Next.js frontend source
│   ├── app/                      # App Router pages & API routes
│   │   ├── api/                  # REST API endpoints
│   │   │   ├── health/           # Health check
│   │   │   ├── stations/         # Station search & detail
│   │   │   ├── trains/           # Train search, detail, live map
│   │   │   └── trains-between/   # Trains between two stations
│   │   ├── live-map/             # Interactive live train map
│   │   ├── station/[code]/       # Station detail page
│   │   ├── train/[number]/       # Train detail page
│   │   └── trains-between/       # Trains between UI
│   ├── components/               # Shared React components
│   ├── generated/prisma/         # Generated Prisma client (auto-generated)
│   └── lib/                      # Utilities (prisma, redis, cache)
├── backend/                      # Background scraping service
│   ├── src/
│   │   ├── index.ts              # Entry point with cron scheduler
│   │   ├── orchestrator.ts       # Multi-provider chain with fallback
│   │   ├── jobs/                 # Scraping jobs
│   │   │   ├── scrape-schedules.ts
│   │   │   ├── scrape-stations.ts
│   │   │   └── query-trains-between.ts
│   │   ├── providers/            # Data provider implementations
│   │   │   ├── ntes.ts           # NTES (Indian Railways) scraper
│   │   │   └── railradar.ts      # RailRadar API client
│   │   ├── lib/                  # DB connection, utilities
│   │   └── types/                # TypeScript interfaces
│   └── prisma/                   # Backend Prisma schema
├── prisma/                       # Root Prisma schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── seed.ts                   # Database seeder (stations + trains)
├── public/                       # Static assets
├── netlify.toml                  # Netlify deployment config
└── package.json
```

---

## Prerequisites

| Requirement    | Minimum Version | Notes                                                                                        |
| -------------- | --------------- | -------------------------------------------------------------------------------------------- |
| **Node.js**    | **>= 20.x**     | Required — Prisma 7 uses WASM features unavailable in Node 16/18. Use `nvm use 20` if needed |
| **PostgreSQL** | >= 14           | Local instance or hosted (Supabase, Neon, etc.)                                              |
| **Redis**      | >= 6            | Optional — app degrades gracefully without it (no caching)                                   |
| **npm**        | >= 10           | Comes with Node 20                                                                           |

> **⚠️ Node.js 20+ is strictly required.** Prisma 7's WASM-based schema engine uses `externref` which is not supported in Node.js < 20. You will get a `CompileError: invalid value type 'externref'` if using an older version.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/rail-info.git
cd rail-info
```

### 2. Install dependencies

```bash
# Frontend (root)
npm install

# Backend
cd backend && npm install && cd ..
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

### 4. Set up the database

```bash
# Run migrations
npx prisma migrate dev

# Seed stations and trains from RailRadar API
npm run seed
```

### 5. Start development

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Backend scraping service
cd backend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Environment Variables

Create a `.env` file in the project root:

| Variable                   | Required | Description                                                                                           |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | **Yes**  | PostgreSQL connection string, e.g. `postgres://user:pass@localhost:5432/railinfo`                     |
| `RAILRADAR_API_KEY`        | **Yes**  | API key for [RailRadar](https://railradar.org). Required for seeding, live data, and backend scraping |
| `REDIS_URL`                | No       | Redis connection string, e.g. `redis://localhost:6379`. If unset, caching is disabled                 |
| `DISABLE_DB_SSL`           | No       | Set to `true` to disable SSL for local PostgreSQL connections                                         |
| `SCHEDULE_SCRAPE_INTERVAL` | No       | Backend schedule scrape interval in minutes (default: `360` = 6 hours)                                |

```env
DATABASE_URL="postgres://postgres:root@localhost:5432/railinfo"
RAILRADAR_API_KEY="your_api_key_here"
REDIS_URL="redis://localhost:6379"
```

> Both the frontend and backend read from the same root `.env` file.

---

## Database Setup

The project uses **Prisma 7** with the PostgreSQL `pg` driver adapter.

```bash
# Generate the Prisma client
npx prisma generate

# Run all migrations
npx prisma migrate dev

# Seed the database with stations and trains
npm run seed
```

### Models

| Model      | Description                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `Station`  | Railway station with code, name, Hindi name, coordinates                       |
| `Train`    | Train with number, name, source/destination station references                 |
| `Schedule` | Per-stop schedule entries linking trains to stations with times, day, distance |
| `ApiCache` | Key-value cache for API responses (schema defined, not yet used in code)       |

---

## Running the Frontend

```bash
npm run dev        # Development server on http://localhost:3000
npm run build      # Production build (runs prisma generate first)
npm start          # Start production server
npm run lint       # ESLint
```

---

## Running the Backend

The backend is a standalone Node.js service that runs scheduled scraping jobs.

```bash
cd backend

npm run dev                    # Development with hot reload (tsx watch)
npm run build                  # Compile TypeScript → dist/
npm start                      # Run compiled output

# Run individual jobs directly
npm run scrape:schedules       # Scrape train schedules
npm run scrape:stations        # Scrape station metadata (coordinates)
```

### Cron Schedule (when running via `npm run dev` or `npm start`)

| Job             | Schedule                     | Description                                                              |
| --------------- | ---------------------------- | ------------------------------------------------------------------------ |
| Schedule scrape | Every 6 hours (configurable) | Fetches full schedules for all trains and populates the `Schedule` table |
| Station scrape  | Daily at 3:00 AM             | Fills in missing latitude/longitude for stations                         |

### Data Provider Chain

The backend uses a **ProviderChain** pattern — it tries providers in order and falls back on failure:

1. **NTES** (Indian Railways) — `getTrainSchedule`, `getTrainLiveStatus`
2. **RailRadar** — `getTrainSchedule`, `getTrainLiveStatus`, `getTrainsBetween`, `getStationDetail`, `getAllTrains`, `getAllStations`

---

## API Endpoints

All endpoints are under `/api/` and served by Next.js API routes.

| Method | Endpoint                                                    | Description                                                         |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET`  | `/api/health`                                               | Health check — tests DB and Redis connectivity                      |
| `GET`  | `/api/stations/search?q={query}&limit={n}`                  | Search stations by code prefix or name substring                    |
| `GET`  | `/api/stations/{code}`                                      | Station info + live departure/arrival board                         |
| `GET`  | `/api/trains/search?q={query}&limit={n}`                    | Search trains by number prefix or name                              |
| `GET`  | `/api/trains/{number}?journeyDate=&dataProvider=&dataType=` | Train schedule + live data. `dataType`: `static`, `live`, or `full` |
| `GET`  | `/api/trains/{number}/instances?dataProvider=`              | Recent/upcoming run instances of a train                            |
| `GET`  | `/api/trains/live-map`                                      | All currently running trains with live positions                    |
| `GET`  | `/api/trains-between?from={code}&to={code}`                 | All trains between two stations                                     |

---

## Deployment

**Current deployment:** Frontend is currently deployed on Vercel. The backend scraping service is not deployed yet. The project's database is hosted on Vercel. The Netlify configuration is present in the repo but is not currently used.

### Netlify (Frontend)

Note: Netlify configuration exists in the repository but is not currently used — the frontend is deployed on Vercel.

The frontend is configured for Netlify deployment via `netlify.toml`:

```toml
[build]
  command = "npx prisma generate && npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Set `DATABASE_URL`, `RAILRADAR_API_KEY`, and `REDIS_URL` in Netlify environment variables.

### Backend Service

The backend scraping service needs to be deployed separately (e.g., a VPS, Docker container, or any long-running process host):

```bash
cd backend
npm run build
npm start
```

---

## Architecture Notes

### Why is the backend in the same repository?

The `backend/` directory lives inside the root project rather than in a separate `frontend/` + `backend/` monorepo structure. This is intentional for now due to **tight coupling through the shared Prisma client**:

- Both frontend and backend use the **same generated Prisma client** at `src/generated/prisma/`
- The backend references it via an import map: `"#prisma/*": "../src/generated/prisma/*"`
- The backend's `prisma.config.ts` shares the root's migration directory: `../prisma/migrations`
- The root Prisma schema generates the client into `src/generated/prisma/`, which both packages consume

#### What would it take to properly separate them?

To move to a clean `frontend/` + `backend/` structure, you would need to:

1. **Extract a shared `packages/db` package** containing the Prisma schema, generated client, and migration history
2. **Set up npm/pnpm workspaces** in the root `package.json` to link `frontend`, `backend`, and `packages/db`
3. **Update all import paths** — frontend uses `@/generated/prisma/...`, backend uses `#prisma/...`
4. **Move Netlify config** — `netlify.toml` would need `base = "frontend"` or a root-level build script
5. **Relocate the `.env` file** — both packages currently read from the root `.env`; a shared `.env` at root or environment injection would be needed
6. **Move `scripts/seed.ts`** — currently at root, would need a new home (likely `packages/db` or its own script package)

The target structure would look like:

```
rail-info/
├── packages/db/          # Shared Prisma schema + generated client
├── frontend/             # Next.js app
├── backend/              # Scraping/scheduling service
└── package.json          # Workspace root
```

> Simply moving files into `frontend/` without the shared DB package would just shift cross-references around (e.g., `../frontend/src/generated/...`) without actually improving the architecture.

---

## Known Limitations & TODOs

### Incomplete Features

| Area                    | Status             | Details                                                               |
| ----------------------- | ------------------ | --------------------------------------------------------------------- |
| `getStationBoard`       | ❌ Not implemented | Neither NTES nor RailRadar providers implement station board scraping |
| `ApiCache` model        | ❌ Unused          | Defined in Prisma schema but no code reads or writes to it            |
| NTES `getTrainsBetween` | ❌ Not implemented | Only RailRadar provides this                                          |
| NTES `getStationDetail` | ❌ Not implemented | Only RailRadar provides this                                          |

### Known Risks

| Area                  | Risk                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NTES HTML parser**  | Positional column parsing (`[name, code, arr, dep, day, dist]`) — any layout change on the NTES website will silently break schedule scraping     |
| **NTES endpoints**    | Unofficial/undocumented — `enquiry.indianrail.gov.in/ntesEnquiry/train/{number}` may change or require authentication without notice              |
| **RailRadar API key** | If `RAILRADAR_API_KEY` is missing, all RailRadar calls fail and fall back to NTES silently. A startup warning is logged but the service continues |

---

## License & Scraping Disclaimer

This project is licensed under the MIT License — see the `LICENSE` file in the repository.

Scraping Disclaimer: The web scraping and data-collection code in this repository is provided for educational and practice purposes only. Scraping public
websites may be subject to the target website's terms of service, robots.txt rules, and applicable laws. The legality of scraping depends on the website,
the jurisdiction, and the use of collected data; it may be disallowed or illegal in some cases. You are responsible for ensuring your use complies with
applicable laws and the target site's policies. The authors do not provide legal advice and accept no liability for misuse.

## Scripts Reference

### Root (Frontend)

| Script  | Command                         | Description                                           |
| ------- | ------------------------------- | ----------------------------------------------------- |
| `dev`   | `next dev`                      | Start Next.js development server                      |
| `build` | `prisma generate && next build` | Generate Prisma client and build for production       |
| `start` | `next start`                    | Start production server                               |
| `lint`  | `eslint`                        | Run ESLint                                            |
| `seed`  | `tsx scripts/seed.ts`           | Seed database with stations and trains from RailRadar |

### Backend

| Script             | Command                            | Description                                   |
| ------------------ | ---------------------------------- | --------------------------------------------- |
| `dev`              | `tsx watch src/index.ts`           | Start backend with hot reload                 |
| `build`            | `npm run generate && tsc`          | Generate Prisma client and compile TypeScript |
| `start`            | `node dist/index.js`               | Run compiled backend                          |
| `scrape:schedules` | `tsx src/jobs/scrape-schedules.ts` | Run schedule scraper directly                 |
| `scrape:stations`  | `tsx src/jobs/scrape-stations.ts`  | Run station scraper directly                  |

---

<div align="center">

</div>
