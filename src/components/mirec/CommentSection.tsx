import { useState } from "react";
import { MirecAvatar } from "./Avatar";
import type { Post } from "@/lib/mockData";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

interface Props {
  post: Post;
  onAddComment: (postId: string, text: string) => void;
}

export function CommentSection({ post, onAddComment }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!text.trim()) return;
    onAddComment(post.id, text.trim());
    setText("");
  };

  return (
    <div className="pt-2 border-t border-border/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        {post.comments_count > 0 ? `${post.comments_count} commentaire(s)` : "Commenter"}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {(post.comments || []).map((c) => (
            <div key={c.id} className="flex gap-2">
              <MirecAvatar initials={c.profiles.avatar_initials} color={c.profiles.avatar_color} size={28} />
              <div>
                <span className="text-xs font-semibold text-foreground">{c.profiles.full_name}</span>
                <p className="text-xs text-muted-foreground">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Écrire un commentaire..."
              className="flex-1 px-3 py-2 rounded-full border border-border text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={submit}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
