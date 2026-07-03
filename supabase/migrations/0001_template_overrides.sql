-- Migration: template_overrides
-- Catalog-level admin overrides for built-in (system) templates.
--
-- Run this once in your Supabase project (SQL Editor or `supabase db push`).
-- Until it is applied, the app falls back to the static TEMPLATE_CONFIGS
-- defaults (overrides simply have no effect) — nothing breaks.
--
-- One row per built-in templateId (e.g. 'reception-luxury'). Only the columns
-- an admin actually changes need to be set; NULLs fall back to code defaults.

create table if not exists public.template_overrides (
  template_id     text primary key,
  enabled         boolean     not null default true,
  name            text,
  tagline         text,
  description     text,
  emoji           text,
  palette         jsonb,
  thumbnail_frame integer,
  updated_at      timestamptz not null default now()
);

comment on table public.template_overrides is
  'Catalog-level admin overrides for built-in/system templates (enable-disable, display fields, gallery palette, thumbnail frame). Server-side only.';

-- Server code uses the service-role key (bypasses RLS). If you expose this
-- table to anon/authenticated clients, add RLS policies accordingly. By
-- default we keep RLS enabled with no public policies so only the service role
-- (server) can read/write it.
alter table public.template_overrides enable row level security;
