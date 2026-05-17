# LEXGUARD: AI Rights & Contract Intelligence System

![LEXGUARD Header](public/lexguard_static_hero.png)

## Background
In today’s digital and professional ecosystem, individuals and organizations routinely accept legally binding agreements without fully understanding their implications. Employment contracts, vendor agreements, subscription terms, rental agreements, insurance policies, platform terms of service, and privacy policies often contain complex legal language that is difficult for non-specialists to interpret.

These agreements may include restrictive clauses, hidden liabilities, broad intellectual property transfers, automatic renewals, one-sided arbitration mechanisms, unfavorable termination conditions, or excessive data collection practices. 

**LEXGUARD** was built to solve this. It is an adversarial, multi-agent AI contract intelligence platform designed to identify contractual risks, reason about their practical implications, and present insights in an understandable, transparent, and highly engaging manner.

## Problem Statement
Design and develop an AI-powered contract intelligence platform capable of analyzing legal and quasi-legal documents to identify potentially harmful, exploitative, ambiguous, or high-risk clauses before users agree to them. The system extracts and classifies important clauses, evaluates contractual risks, reasons about possible real-world implications, and provides interpretable explanations from the perspective of the affected individual or organization.

## Architecture & Technology Stack

- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Database & RAG Storage:** Supabase (PostgreSQL with `pgvector` for 3072-dimensional embeddings)
- **AI Orchestration:** LangGraph (Multi-Agent State Graph)
- **AI Models:** Google Gemini (`gemini-2.5-flash` for reasoning, `models/gemini-embedding-001` for vectorization)
- **Document Parsing:** `unpdf` (PDFs), `mammoth` (DOCX), and native TXT processing
- **Storage:** Cloudinary

## The LangGraph Adversarial Pipeline
LEXGUARD's intelligence is powered by a completely autonomous, multi-agent Retrieval-Augmented Generation (RAG) pipeline built on LangGraph. The execution order is as follows:

1. **Autonomous Classifier Node:** Fetches the very first document chunk to infer the document context (e.g., "SaaS Subscription Agreement between Vendor and Client") via `gemini-2.5-flash`.
2. **Strategist Node (Query Expander):** Dynamically injects the classifier's context to generate 5-7 hyper-targeted RAG queries (targeting advanced liabilities like AI training data rights, IP ownership, etc.).
3. **Retriever Node:** Maps queries to 3072-dimension vectors and executes concurrent Supabase RPC searches (`match_document_chunks`) with Map-based deduplication to prevent context starvation.
4. **Adversarial Red Team Node:** Acts as an aggressive "vulture lawyer" persona, analyzing retrieved chunks for hidden fees, one-sided clauses, and missing protections. Output is strictly validated via Zod.
5. **Verifier Node (Legal Auditor):** Strictly cross-references the Red Team outputs against the retrieved raw text chunks, aggressively deleting any AI hallucinations.
6. **Advisor Node:** Maps verified risks into a strict Zod schema, highlighting the "trap", the "harsh reality" of what happens if triggered, and providing actionable advice.

## Core Features & System Capabilities
- **Multi-Format Ingestion:** Supports automated chunking (2000 size, 500 overlap) for `.pdf`, `.docx`, and `.txt` files to preserve complex cross-page legal context.
- **Explainable Legal Insights:** Translates complex legalese into plain English "Harsh Realities" and actionable counter-measures.
- **Hallucination Prevention:** The dedicated Verifier Node acts as a strict checkpoint to ensure no risk is reported unless it is explicitly backed by the source text.
- **API Rate Limit Resilience:** Integrates a global exponential backoff utility across all LLM invocations to automatically recover from API `429 Too Many Requests` limits.
- **The "Blue Adversarial HUD":** A stunning, futuristic cybersecurity dashboard featuring a glassmorphic Cyber-Scanner dropzone, simulated terminal logs, and a dynamic, internally-scrolling Threat Matrix. Risk cards use dynamic multi-color neon mapping based on severity (Critical/High = Red, Medium = Yellow, Low = Green).
- **Vercel Pre-Deployment Hardened:** Includes strict 4.5MB serverless file limits and strict environment variable security sweeps.

## Running Locally

1. **Clone the repository & install dependencies:**
   ```bash
   git clone <repo-url>
   cd lexguard
   npm install
   ```

2. **Configure Environment Variables (`.env.local`):**
   ```env
   GOOGLE_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   CLOUDINARY_URL=your_cloudinary_url
   ```

3. **Run the Next.js Development Server:**
   ```bash
   npm run dev
   ```

## Constraints & Disclaimer
*LEXGUARD is an experimental AI tool designed for educational and transparency purposes. It is not a replacement for certified legal professionals and does not provide legally binding advice. Always consult a lawyer before signing significant contracts.*
