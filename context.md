# LEXGUARD Context

## Overall Goal
Building LEXGUARD: an adversarial, multi-agent AI contract intelligence platform.

## Tech Stack
- **Frontend/Backend:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Database/Auth:** Supabase
- **Orchestration:** LangGraph (Agents)
- **Caching/State:** Upstash (Redis)
- **Media/Assets:** Cloudinary

## Progress So Far
- **Initialization:** Core Next.js project initialized with required dependencies.
- **Base Layout & UI:** Created the foundational folder structure (`agents/`, `lib/`, `components/`) and implemented a responsive, professional Hero component for the landing page with a static legal tech background image.
- **Hydration Fix:** Added `suppressHydrationWarning` to the root HTML layout to prevent browser extension mismatch errors.
- **Database & Storage Configuration:** Scaffolded `.env.local` for credentials, initialized `lib/supabase.ts` and `lib/cloudinary.ts` storage clients, and created the initial Supabase pgvector schema migration. The `document_chunks` table and `match_document_chunks` RPC function are now configured for `vector(3072)` to accommodate `models/gemini-embedding-001`. We are intentionally *not* using an HNSW index because pgvector restricts it to 2000 dimensions, and exact nearest-neighbor search is perfectly performant for document-scale RAG.
- **Phase 2: LangGraph Orchestration Begun:** Defined our `GraphState` schema using the LangGraph Annotation pattern (`src/agents/state.ts`), managing state for documentId, queries, retrievedChunks, risks, and finalReport. Implemented the first agent node, `queryExpander` (`src/agents/nodes/queryExpander.ts`), leveraging `gemini-2.5-flash` (updated from `gemini-1.5-pro` to fix a 404 API error) and `zod` to force structured JSON outputs containing strategic legal search queries. Created the LangGraph compilation engine (`src/agents/graph.ts`) mapping the nodes and edges, and built a test API route (`/api/analyze`) to execute the graph pipeline.
- **Phase 2: Retriever Node:** Completed the `retrieverNode` (`src/agents/nodes/retriever.ts`), which validates state and concurrently maps generated queries to 3072-dimension vectors (`models/gemini-embedding-001`). It executes concurrent Supabase RPC searches (`match_document_chunks`) and implements Map-based deduplication to ensure unique context chunks are passed downstream.
- **Ingestion Pipeline:** Built a full PDF ingest flow (`/api/ingest`) that uploads to Cloudinary, extracts text via `unpdf` (replaced `pdf-parse` due to Next.js server-side web worker conflicts; fixed a chunking bug by enabling `{ mergePages: true }` in the extraction config to ensure compatibility with LangChain), chunks it via LangChain, generates embeddings using `models/gemini-embedding-001`, and bulk inserts into Supabase. Corrected the asynchronous embedding generation and mapping logic with explicit dimension validations to fix a Supabase pgvector dimension error. Wired the `Hero.tsx` component to handle file uploads with a loading state, and added comprehensive debug logging to the `/api/ingest` route.

## Core System Instruction
*Note to AI Agent:* This `context.md` file must be updated at the end of every single task to maintain a perfect, running memory of our architecture, database schemas, and state.
