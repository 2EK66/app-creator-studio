-- Ajoute la colonne image_url à la table posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Crée le bucket de stockage pour les images de posts (si pas déjà créé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour lire les images (tout le monde)
CREATE POLICY "post_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

-- Politique pour uploader les images (utilisateurs connectés)
CREATE POLICY "post_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images');
