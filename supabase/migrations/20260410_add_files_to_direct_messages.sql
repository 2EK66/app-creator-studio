-- Ajoute les colonnes de fichiers à la table direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Crée le bucket de stockage pour les fichiers des messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-files', 'dm-files', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour lire les fichiers (tout le monde)
CREATE POLICY "dm_files_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'dm-files');

-- Politique pour uploader les fichiers (utilisateurs connectés)
CREATE POLICY "dm_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dm-files');
