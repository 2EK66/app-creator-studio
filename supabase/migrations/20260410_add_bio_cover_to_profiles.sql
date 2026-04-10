-- Add bio and cover_url columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create covers storage bucket (run if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own cover photos
CREATE POLICY IF NOT EXISTS "Users can upload covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers');

CREATE POLICY IF NOT EXISTS "Covers are publicly viewable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'covers');

CREATE POLICY IF NOT EXISTS "Users can update their covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers');
