# Frontend (Next.js) – AdvanceSearchEngine

This directory contains the Next.js frontend for the AI search assistant.

## Setup

1. Install dependencies (using npm, yarn or pnpm):
   ```bash
   cd frontend
   npm install
   # or yarn install
   # or pnpm install
   ```
2. Copy environment template and configure variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Typical settings are:
   ```ini
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Build / Production

```bash
npm run build
npm start
```

## Testing and linting

```bash
npm run lint
npm run test
```

## Docker

The root `docker-compose.yml` builds the frontend container automatically.

---

_This README covers only the frontend. For full-stack details and backend
instructions, see the [root README](../README.md)._