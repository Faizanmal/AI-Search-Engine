# Backend (Django) – AdvanceSearchEngine

This directory contains the Django backend powering the AI search assistant.

## Quick Start

1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy environment template and fill in keys:
   ```bash
   cp .env.example .env
   ```
4. Run migrations and start the development server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## Environment Variables
The `.env` file should contain your OpenAI, Pinecone and Tavily API keys:

```ini
OPENAI_API_KEY=...
PINECONE_API_KEY=...
TAVILY_API_KEY=...
```

Other Django settings can be overridden in `backend/settings.py` or by
creating a `local_settings.py` (which is ignored by git).

## Testing

```bash
python manage.py test api
```

## Docker

A `Dockerfile` and `docker-compose.yml` at the project root can be used to
build and run the entire application including frontend and backend. Refer to
the root README for usage.

---

_This README is specific to the backend service. For general project
information see the [root README](../README.md)._