import { useState, useRef } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const postTypes = [
  { key: "post",      label: "Post",       emoji: "💬" },
  { key: "testimony", label: "Témoignage", emoji: "✨" },
  { key: "prayer",    label: "Prière",     emoji: "🙏" },
  { key: "verse",     label: "Verset",     emoji: "📖" },
] as const;

interface Props {
  onClose: () => void;
  onSubmit: (data: { content: string; type: string; imageUrl?: string }) => Promise<void>;
}

export function NewPostModal({ onClose, onSubmit }: Props) {
  const { user } = useAuth();
  const [content, setContent]           = useState("");
  const [type, setType]                 = useState("post");
  const [loading, setLoading]           = useState(false);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile || !user) return undefined;
    setUploading(true);
    try {
      const ext  = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, imageFile);
      if (error) throw error;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error("Erreur upload image:", err);
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!content.trim() && !imageFile) return;
    setLoading(true);
    const imageUrl = await uploadImage();
    await onSubmit({ content: content.trim(), type, imageUrl });
    setLoading(false);
    onClose();
  };

  const busy = loading || uploading;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Nouveau post</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 flex-wrap">
          {postTypes.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                type === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Partagez avec la communauté..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border p-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Image preview */}
        {imagePreview && (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={imagePreview} alt="Aperçu" className="w-full max-h-60 object-cover" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            Photo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            onClick={submit}
            disabled={busy || (!content.trim() && !imageFile)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-mirec-800 to-mirec-900 text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? "Envoi de la photo…" : loading ? "Publication…" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
