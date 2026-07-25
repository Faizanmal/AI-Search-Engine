# 🚀 AdvanceSearchEngine – Full‑Stack AI Search Assistant

> **Note:** this repo is organized as a monorepo.  Backend‑specific and
> frontend‑specific instructions live in `backend/README.md` and
> `frontend/README.md` respectively.  Read those files for detailed
> environment setup; the sections below provide an overview.

# 🚀 Full-Stack AI Search Assistant (Perplexity Clone) – Django + Next.js Implementation

A powerful AI-powered search engine that retrieves, analyzes, and synthesizes information from the web with citations, trust scores, and follow-up question suggestions.

## 📋 Table of Contents

- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup Instructions](#-setup-instructions)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Advanced Features](#-advanced-features)

---

## 🏗️ System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Next.js   │  HTTP   │    Django    │  API    │   OpenAI    │
│   Frontend  ├────────►│   Backend    ├────────►│   GPT-4     │
│             │◄────────┤   REST API   │◄────────┤             │
└─────────────┘  JSON   └───────┬──────┘         └─────────────┘
                                │
                                │
                   ┌────────────┼────────────┐
                   │            │            │
              ┌────▼───┐   ┌───▼────┐  ┌───▼─────┐
              │ Tavily │   │Pinecone│  │LangChain│
              │  API   │   │Vector  │  │   RAG   │
              │        │   │  DB    │  │ Pipeline│
              └────────┘   └────────┘  └─────────┘
```

### Data Flow

1. **User Query** → Frontend sends query to `/api/query/`
2. **Web Retrieval** → Backend uses Tavily to fetch 5-10 relevant sources
3. **RAG Processing** → LangChain pipeline processes documents
4. **LLM Generation** → OpenAI GPT-4 generates synthesized answer
5. **Citation Extraction** → Backend extracts and formats source URLs
6. **Trust Scoring** → Algorithm calculates confidence score
7. **Follow-ups** → LLM generates 3 related questions
8. **Response** → JSON sent back to frontend with answer, sources, score, followups

---

## ✨ Features

### AI Search
- Intelligent web search with citations, trust scores, and follow-ups
- History, bookmarks, collections, alerts, analytics, and trends
- Plugin marketplace and developer API keys
- Fact-check assist and export tools

### FormForge
- AI-assisted form generation from a natural-language prompt
- Drag-friendly editor with field types (including **file upload** and **payment**)
- Conditional logic (show/hide fields)
- Public hosted forms + embed code
- Submission analytics
- Integrations that fire on submit:
  - Webhook (HMAC-signed)
  - Email notifications
  - Google Sheets (OAuth + spreadsheet ID)
  - Stripe Checkout (per payment field)
  - Slack Incoming Webhooks
  - Notion database pages
  - Zapier Catch Hooks

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.2.7
- **API**: Django REST Framework 3.15.2
- **AI/ML**:
  - LangChain 0.3.7
  - OpenAI GPT-4-turbo
  - LangChain-OpenAI 0.2.9
  - LangChain-Pinecone 0.2.0
- **Vector DB**: Pinecone 5.0.1
- **Search API**: Tavily
- **HTTP**: aiohttp 3.11.7 (async requests)
- **CORS**: django-cors-headers 4.6.0

### Frontend
- **Framework**: Next.js 16.0.1 (App Router)
- **UI**: React 19.2.0
- **Styling**: TailwindCSS 4.0
- **Components**: Custom shadcn/ui components
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Markdown**: react-markdown + remark-gfm
- **TypeScript**: Full type safety

---

## 📁 Project Structure

### Backend Structure

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
│
├── backend/
│   ├── __init__.py
│   ├── settings.py          # Django settings + CORS config
│   ├── urls.py              # Main URL routing
│   ├── wsgi.py
│   └── asgi.py
│
└── api/
    ├── __init__.py
    ├── apps.py
    ├── views.py             # API endpoints (QueryView, HealthCheck)
    ├── urls.py              # API URL patterns
    ├── serializers.py       # Request/Response serializers
    ├── rag_pipeline.py      # Main RAG orchestrator
    │
    └── utils/
        ├── __init__.py
        ├── retriever.py         # Web search (Tavily integration)
        ├── summarizer.py        # LLM answer generation
        └── citation_extractor.py # Source formatting
```

### Frontend Structure

```
frontend/
├── package.json
├── .env.local.example
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── search/
    │       └── page.tsx         # Main search interface
    │
    ├── components/
    │   ├── ChatBox.tsx          # Main chat container
    │   ├── MessageBubble.tsx    # Individual message display
    │   ├── CitationCard.tsx     # Source citations panel
    │   ├── TrustMeter.tsx       # Confidence score display
    │   ├── FollowUps.tsx        # Related questions
    │   └── ui/                  # shadcn/ui components
    │
    ├── lib/
    │   ├── search-api.ts        # API client for backend
    │   └── utils.ts
    │
    └── types/
        └── search.ts            # TypeScript interfaces
```

---

## 🚀 Setup Overview

The repository is split into backend and frontend subprojects; each has
its own README with step‑by‑step instructions.  In general, you will need:

### Prerequisites

- **Python**: 3.10 or higher (backend)
- **Node.js**: 18.0 or higher (frontend)
- **API Keys**:
  - OpenAI API key ([platform.openai.com](https://platform.openai.com/api-keys))
  - Pinecone API key ([pinecone.io](https://www.pinecone.io/))
  - Tavily API key ([tavily.com](https://tavily.com/))

### Docker

A `Dockerfile` and `docker-compose.yml` at the project root provide a
convenient way to run both services together.  Run:

```bash
# build and start both frontend/backed
docker-compose up --build
```

Services expose ports `8000` (backend) and `3000` (frontend) by default.

Refer to the sub‑README files for more details on individual workflows.



### Testing the Application

**Search**
1. Open `http://localhost:3000/search`
2. Enter a query like "What is quantum computing?"

**FormForge**
1. Seed catalog data: `cd backend && python manage.py seed_catalog`
2. Open `http://localhost:3000/dashboard` (create/login first)
3. Create a form from prompt or template → edit → publish → open `/form/<slug>`
4. Configure integrations under `/forms/<id>/integrations`

**API Keys & Plugins**
- `/api-keys` — create/revoke developer keys
- `/plugins` — marketplace (after `seed_catalog`)

---

## 📡 API Documentation

### Endpoints

#### `POST /api/query/`

Process a search query and return AI-generated answer with sources.

**Request**:
```json
{
  "query": "What is quantum computing?"
}
```

**Response**:
```json
{
  "answer": "Quantum computing is a type of computation that harnesses quantum mechanical phenomena...",
  "sources": [
    {
      "position": 1,
      "url": "https://example.com/quantum",
      "title": "Introduction to Quantum Computing",
      "snippet": "Quantum computing uses quantum bits..."
    }
  ],
  "trust_score": 85,
  "followups": [
    "How does a quantum computer differ from classical computers?",
    "What are the practical applications of quantum computing?",
    "What is quantum entanglement?"
  ]
}
```

#### `POST /api/similar-queries/`

Retrieve similar past queries from vector database.

**Request**:
```json
{
  "query": "quantum computing",
  "k": 3
}
```

**Response**:
```json
{
  "similar_queries": [
    {
      "query": "quantum algorithms",
      "answer": "Quantum algorithms...",
      "relevance": "high"
    }
  ]
}
```

#### `GET /api/health/`

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "service": "AI Search Engine API",
  "version": "1.0.0"
}
```

---

## 🎨 Frontend Components

### ChatBox
Main container managing the chat interface, message state, and API interactions.

**Features**:
- Input field with submit button
- Message history
- Loading states
- Error handling
- Auto-scroll to new messages

### MessageBubble
Displays individual messages from user or AI assistant.

**Features**:
- User vs Assistant styling
- Markdown rendering
- Timestamp display
- Nested components (Citations, Trust, Follow-ups)

### CitationCard
Shows source citations with clickable links.

**Features**:
- Numbered references
- Domain extraction
- Snippet preview
- External link icons

### TrustMeter
Visual confidence score indicator.

**Features**:
- Color-coded score (red/yellow/green)
- Progress bar
- Confidence label
- Source quality indicators

### FollowUps
Displays clickable follow-up questions.

**Features**:
- Button list of questions
- Click to submit new query
- Related topic suggestions

---

## 🚢 Deployment

### Backend Deployment (Railway/Render)

1. **Prepare for production**:
   - Set `DEBUG=False` in `.env`
   - Add production domain to `ALLOWED_HOSTS`
   - Configure production database (PostgreSQL recommended)

2. **Update `settings.py`**:
   ```python
   import dj_database_url
   
   DATABASES = {
       'default': dj_database_url.config(
           default=os.getenv('DATABASE_URL')
       )
   }
   ```

3. **Create `Procfile`**:
   ```
   web: gunicorn backend.wsgi --log-file -
   ```

4. **Add to `requirements.txt`**:
   ```
   gunicorn==21.2.0
   dj-database-url==2.1.0
   psycopg2-binary==2.9.9
   ```

5. **Deploy to Railway**:
   ```bash
   railway login
   railway init
   railway up
   ```

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your backend URL

---

## 🧠 Advanced Features

### Multi-Agent Workflow

The system uses a multi-stage agent approach:

1. **Retriever Agent** - Fetches relevant web sources
2. **Summarizer Agent** - Creates concise synthesis
3. **Citation Agent** - Extracts and formats references
4. **Verifier Agent** - Calculates trust scores
5. **Formatter Agent** - Structures final JSON response

### Trust Scoring Algorithm

The trust score (0-100) is calculated based on:

- **Source Quantity** (+20 max): More sources = higher confidence
- **Domain Diversity** (+15 max): Variety of domains
- **Content Relevance** (+10): Key terms across sources
- **Answer Completeness** (+5): Comprehensive response

### Vector Database Integration

Pinecone stores past interactions for:
- Similar query suggestions
- Context-aware responses
- Performance optimization
- User personalization

### Caching Strategy

Optional Redis integration for:
- Repeated query caching
- Rate limiting
- Session management
- Performance boost

---

## 🔧 Configuration Options

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Optional |
| `PINECONE_INDEX_NAME` | Pinecone index name | Optional |
| `TAVILY_API_KEY` | Tavily search API key | Optional |
| `SECRET_KEY` | Django secret key | Yes |
| `DEBUG` | Debug mode | No |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

---

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check the documentation above
- Review the code comments

---

**Built with ❤️ using Django, Next.js, LangChain, and OpenAI**
