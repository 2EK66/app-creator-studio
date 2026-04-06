
-- Add post_id column to comments
ALTER TABLE public.comments ADD COLUMN post_id uuid;

-- Allow everyone to comment (update existing insert policy)
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Add update policy for comment authors
CREATE POLICY "comments_update" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);
