# AteDays Homebase Dashboard

Internal dashboard for the Ate Days supplement startup. A clean, Notion-meets-Stripe style interface for managing company knowledge, timelines, and resources.

## Tech Stack

- **Framework**: Next.js 14+
- **Styling**: Tailwind CSS
- **Components**: Shadcn/UI
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Anthropic Claude + OpenAI Embeddings

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account (free tier works)
- Anthropic API key
- OpenAI API key (for embeddings)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Fill in your API keys in .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the contents of `supabase/setup.sql` to create tables and functions
4. Copy your project URL and anon key to `.env.local`

## Project Structure

```
ate-days-homebase/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home - Executive Summary
│   ├── knowledge-base/
│   │   └── page.tsx            # AI Chat with RAG
│   ├── documents/
│   │   └── page.tsx            # Document Library
│   ├── timeline/
│   │   └── page.tsx            # Go-To-Market Timeline
│   ├── brand-research/
│   │   └── page.tsx            # Brand Research
│   ├── financial/
│   │   └── page.tsx            # Financial Views
│   └── api/
│       ├── chat/route.ts       # RAG chat endpoint
│       └── documents/          # Document upload/list endpoints
├── components/
│   ├── ui/                     # Shadcn/UI components
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── upload-zone.tsx         # Drag-drop file upload
│   ├── document-list.tsx       # Document management
│   └── source-citation.tsx     # AI source references
├── lib/
│   ├── utils.ts                # Utility functions
│   ├── supabase.ts             # Supabase client
│   ├── anthropic.ts            # Claude AI client
│   ├── embeddings.ts           # OpenAI embeddings
│   └── document-processor.ts   # PDF/Excel parsing
└── supabase/
    └── setup.sql               # Database setup script
```

## Features

- **Executive Summary**: Dashboard home with action items, milestones, and key resources
- **Knowledge Base**: AI-powered chat that searches your uploaded documents (RAG)
- **Document Library**: Drag-and-drop upload for PDFs, Excel, and CSV files
- **Go-To-Market Timeline**: Visual timeline of launch phases and milestones
- **Brand Research**: Market insights and brand strategy documentation
- **Financial Views**: Budget tracking and financial health metrics

## RAG (Retrieval-Augmented Generation)

The Knowledge Base uses RAG to answer questions based on your company documents:

1. **Upload**: Documents are parsed, chunked, and embedded using OpenAI's embedding model
2. **Store**: Chunks and embeddings are stored in Supabase with pgvector
3. **Search**: When you ask a question, it's embedded and matched against document chunks
4. **Generate**: Relevant chunks are sent to Claude to generate an accurate answer
5. **Cite**: Source documents are shown with each response

### Supported File Types

- PDF documents
- Excel spreadsheets (.xlsx, .xls)
- CSV files

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI APIs
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key
```
