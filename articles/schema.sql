-- Supabase Articles Table Schema
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author TEXT DEFAULT '百鲸咨询',
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  featured BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for frontend display)
CREATE POLICY "Articles are publicly readable" ON articles
  FOR SELECT USING (true);

-- Allow authenticated insert (for admin)
CREATE POLICY "Authenticated users can insert articles" ON articles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated update (for admin)
CREATE POLICY "Authenticated users can update articles" ON articles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated delete (for admin)
CREATE POLICY "Authenticated users can delete articles" ON articles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();