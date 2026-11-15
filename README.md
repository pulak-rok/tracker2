# TradePulse Command

Professional trading roadmap terminal, daily journal, and analytics suite built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase PostgreSQL.

## Features
- **Multiple Independent Roadmaps**: Set specific profit targets, starting balance, risk per trade, and RR.
- **Automated Database Triggers**: Single source of truth where daily records and roadmap totals are atomically updated via PostgreSQL triggers.
- **Detailed & Summary Daily Journals**: Track trading sessions, entries, wins, losses, break-evens, and individual trade outcomes.
- **Binomial Risk & Probability Calculator**: Statistical edge simulation.
- **Vercel & Supabase Ready**: Full Row Level Security (RLS) and SSR authentication.

## Local Development
1. Clone repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Run Supabase migration script `supabase/migrations/0001_schema.sql` in your Supabase SQL Editor.
5. Run local dev server:
   ```bash
   npm run dev
   ```
