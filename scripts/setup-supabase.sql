-- scripts/setup-supabase.sql
-- PRD §12: Data Schema — matches actual OrderData TypeScript interface
-- Run this in your Supabase SQL Editor (safe to re-run — uses IF NOT EXISTS)

-- 1. Orders Table (primary table — matches OrderData interface in types.ts)
CREATE TABLE IF NOT EXISTS public.orders (
  id               VARCHAR(50)  PRIMARY KEY,           -- e.g. WI-XXXXXXXX
  customer_phone   VARCHAR(20)  NOT NULL,
  customer_email   VARCHAR(255),
  status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  style            VARCHAR(50)  NOT NULL DEFAULT 'royal',
  tier             VARCHAR(20)  NOT NULL DEFAULT 'standard',
  scenes           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  music_track      VARCHAR(100) NOT NULL DEFAULT 'romantic-piano',
  photos           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  details          JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- groomName, brideName, venue, etc.
  video_url        TEXT,
  thumbnail_url    TEXT,
  notes            TEXT,
  avatar_qa        JSONB,                                  -- avatar QA sub-state (OrderAvatarQa); NULL until avatars generated
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1b. Backfill avatar_qa column on pre-existing orders tables (idempotent)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS avatar_qa JSONB;

-- 2. Clients Table (for future CRM features)
CREATE TABLE IF NOT EXISTS public.clients (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  phone      VARCHAR(20)  NOT NULL UNIQUE,
  email      VARCHAR(255),
  name       VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Render Jobs Table (for tracking render progress)
CREATE TABLE IF NOT EXISTS public.render_jobs (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id           VARCHAR(50) REFERENCES public.orders(id) ON DELETE CASCADE,
  status             VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  progress           INTEGER     DEFAULT 0,
  error_message      TEXT,
  lambda_request_id  VARCHAR(100),
  started_at         TIMESTAMP WITH TIME ZONE,
  completed_at       TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_modtime ON public.orders;
CREATE TRIGGER update_orders_modtime
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. Custom Templates Table (Template Manager — Phase 1)
-- Stores admin-created templates as JSONB scene arrays.
-- System templates (hardcoded in types.ts) are NOT stored here.
CREATE TABLE IF NOT EXISTS public.custom_templates (
  id           VARCHAR(80)  PRIMARY KEY,         -- slug e.g. "baraat-grand"
  name         VARCHAR(100) NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'draft',  -- draft | active | inactive
  ceremony     VARCHAR(30)  NOT NULL,             -- haldi | mehandi | sangeet | wedding | baraat | reception
  emoji        VARCHAR(10)  NOT NULL DEFAULT '🎬',
  palette      JSONB        NOT NULL DEFAULT '{"primary":"#D4AF37","secondary":"#0A0500","accent":"#F0D060","background":"#0A0500"}'::jsonb,
  scenes       JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- ordered SceneDefinition[]
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_custom_templates_modtime ON public.custom_templates;
CREATE TRIGGER update_custom_templates_modtime
  BEFORE UPDATE ON public.custom_templates
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. Row Level Security (RLS)
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- NOTE: service_role key used in Next.js backend bypasses RLS automatically.
-- No additional RLS policies needed for server-side access.

