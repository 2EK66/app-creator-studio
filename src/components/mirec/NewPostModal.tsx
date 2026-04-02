import { useState } from "react";
import { X } from "lucide-react";

const postTypes = [
  { key: "post", label: "Post", emoji: "💬" },
  { key: "testimony", label: "Témoignage", emoji: "✨" },
  { key: "prayer", label: "Prière", emoji: "🙏" },
  { key: "verse", label: "Verset", emoji: "📖" },
] as const;

interface Props {
  onClose: () => void;
  onSubmit: (data: { content: string; type: string }) => Promise<void>;
}

export function NewPostModal({ onClose, onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [type, setType] = useState("post");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await onSubmit({ content: content.trim(), type });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
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

        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-mirec-800 to-mirec-900 text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Publication…" : "Publier"}
        </button>
      </div>
    </div>
  );
}
