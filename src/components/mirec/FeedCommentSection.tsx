import { useState, useEffect } from "react";
import { MirecAvatar } from "./Avatar";
import { ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_initials: string;
  created_at: string;
}

interface Props {
  postId: string;
  commentsCount: number;
  userId?: string;
  postAuthorId: string;
}

export function FeedCommentSection({ postId, commentsCount, userId, postAuthorId }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(commentsCount);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, content, author_id, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      const authorIds = [...new Set(data.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || "Anonyme"]));

      setComments(data.map(c => {
        const name = profileMap[c.author_id] || "Anonyme";
        return { ...c, author_name: name, author_initials: name.slice(0, 2).toUpperCase() };
      }));
      setCount(data.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchComments();
  }, [open]);

  const submit = async () => {
    if (!text.trim() || !userId) return;
    const { error } = await supabase.from("comments").insert({
      content: text.trim(),
      author_id: userId,
      post_id: postId,
    });
    if (!error) {
      setText("");
      fetchComments();
    }
  };

  const deleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    setCount(prev => prev - 1);
    await supabase.from("comments").delete().eq("id", commentId);
  };

  return (
    <div className="pt-2 border-t border-border/50">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        {count > 0 ? `${count} commentaire(s)` : "Commenter"}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <MirecAvatar initials={c.author_initials} color="hsl(220 70% 35%)" size={28} />
              <div className="flex-1">
                <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                <p className="text-xs text-muted-foreground">{c.content}</p>
              </div>
              {(userId === c.author_id || userId === postAuthorId) && (
                <button onClick={() => deleteComment(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              )}
            </div>
          ))}

          {userId && (
            <div className="flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="Écrire un commentaire..."
                className="flex-1 px-3 py-2 rounded-full border border-border text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={submit}
                className="p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
