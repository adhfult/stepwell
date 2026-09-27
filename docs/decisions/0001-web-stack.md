# 0001: Next.js + Supabase + Vercel

- Status: accepted

## Context
Solo student developer building a web app used on phones and laptops, with
accounts and a relational data model, on a near-zero budget.

## Decision
Next.js (App Router) + TypeScript + Tailwind, Supabase for Postgres and Auth,
hosted on Vercel. Started from the personal `template-web`.

## Alternatives considered
Firebase (NoSQL fits the career/college joins poorly), Django (fine, but less
agent tooling in this setup), native apps (two codebases; the web works on phones).

## Consequences
Free tiers cover the MVP. Row Level Security becomes the core privacy tool.
Supabase and Vercel limits must be watched as usage grows.
