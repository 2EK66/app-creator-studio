import { useState, useEffect, useCallback } from "react";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { Plus, Bell, RefreshCw, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { FeedCommentSection } from "@/components/mirec/FeedCommentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface FeedPost {
  id: string;
  created_at: string;
  content: string;
  type: string;
  author_id: string;
  author_name: string;
  author_initials: string;
  reactions: { amen: number; feu: number; coeur: number };
  user_reactions: Record<string, boolean>;
  comments_count: number;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function typeConfig(type: string) {
  const map: Record<string, { label: string; textClass: string; bgClass: string }> = {
    prayer:       { label: "🙏 Prière",       textClass: "text-purple-600", bgClass: "bg-purple-50 dark:bg-purple-950/30" },
    testimony:    { label: "✨ Témoignage",    textClass: "text-emerald-600", bgClass: "bg-emerald-50 dark:bg-emerald-950/30" },
    announcement: { label: "📢 Annonce",       textClass: "text-primary",    bgClass: "bg-primary/5" },
    verse:        { label: "📖 Verset du jour", textClass: "text-amber-600",  bgClass: "bg-amber-50 dark:bg-amber-950/30" },
  };
  return map[type] || { label: "💬 Post", textClass: "text-muted-foreground", bgClass: "bg-muted" };
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const filters = [
    { key: "all", label: "Tout" },
    { key: "announcement", label: "📢 Annonces" },
    { key: "testimony", label: "✨ Témoignages" },
    { key: "prayer", label: "🙏 Prières" },
    { key: "verse", label: "📖 Versets" },
  ];

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, type, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData) { setLoading(false); setRefreshing(false); return; }

    const authorIds = [...new Set(postsData.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || "Anonyme"]));

    const postIds = postsData.map(p => p.id);
    const { data: allReactions } = await supabase
      .from("reactions")
      .select("content_id, type, author_id")
      .in("content_id", postIds);

    const enriched: FeedPost[] = postsData.map(post => {
      const postReactions = allReactions?.filter(r => r.content_id === post.id) || [];
      const reactions = { amen: 0, feu: 0, coeur: 0 };
      const user_reactions: Record<string, boolean> = {};
      postReactions.forEach(r => {
        if (r.type in reactions) reactions[r.type as keyof typeof reactions]++;
        if (r.author_id === user?.id) user_reactions[r.type] = true;
      });
      const name = profileMap[post.author_id] || "Anonyme";
      return {
        ...post,
        type: post.type || "post",
        author_name: name,
        author_initials: name.slice(0, 2).toUpperCase(),
        reactions,
        user_reactions,
        comments_count: 0,
      };
    });

    setPosts(enriched);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleReact = async (postId: string, key: "amen" | "feu" | "coeur") => {
    if (!user) { navigate("/auth"); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasActive = post.user_reactions[key];

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactions: { ...p.reactions, [key]: p.reactions[key] + (wasActive ? -1 : 1) },
        user_reactions: { ...p.user_reactions, [key]: !wasActive },
      };
    }));

    if (wasActive) {
      await supabase.from("reactions").delete()
        .eq("content_id", postId).eq("author_id", user.id).eq("type", key);
    } else {
      await supabase.from("reactions").insert({
        content_id: postId, author_id: user.id, type: key,
      });
    }
  };

  const handleNewPost = async (data: { content: string; type: string }) => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("posts").insert({
      content: data.content, type: data.type, author_id: user.id,
    });
    if (!error) fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setMenuOpen(null);
    await supabase.from("reactions").delete().eq("content_id", postId);
    await supabase.from("posts").delete().eq("id", postId);
  };

  const startEdit = (post: FeedPost) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setMenuOpen(null);
  };

  const saveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
    setEditingPost(null);
    await supabase.from("posts").update({ content: editContent.trim() }).eq("id", postId);
  };

  const filtered = filter === "all" ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MirecLogo size={36} />
            <h1 className="font-display text-xl font-bold tracking-wide text-foreground">MIREC</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchPosts(true)} disabled={refreshing}
              className="p-2 rounded-full hover:bg-muted transition-colors">
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-[61px] z-20 bg-background/80 backdrop-blur-md px-4 py-2.5 border-b border-border/30">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucun post dans cette catégorie.
          </div>
        ) : filtered.map((post) => {
          const tc = typeConfig(post.type);
          const isAuthor = user?.id === post.author_id;
          const isEditing = editingPost === post.id;

          return (
            <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <MirecAvatar initials={post.author_initials} color="hsl(220 70% 35%)" size={40} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at || "")}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tc.textClass} ${tc.bgClass}`}>
                  {tc.label}
                </span>
                {isAuthor && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                      className="p-1.5 rounded-full hover:bg-muted transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {menuOpen === post.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                          <button onClick={() => startEdit(post)}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Modifier
                          </button>
                          <button onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mb-4 space-y-2">
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    rows={3} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingPost(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                    <button onClick={() => saveEdit(post.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium">
                      <Check className="w-3.5 h-3.5" /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed mb-4">{post.content}</p>
              )}

              <div className="flex gap-2 pt-3 border-t border-border/30">
                {([
                  { key: "amen" as const, emoji: "🙏", label: "Amen" },
                  { key: "feu" as const, emoji: "🔥", label: "Feu" },
                  { key: "coeur" as const, emoji: "❤️", label: "Cœur" },
                ]).map(r => (
                  <button key={r.key} onClick={() => handleReact(post.id, r.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      post.user_reactions[r.key]
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    <span>{r.emoji}</span>
                    <span>{post.reactions[r.key]}</span>
                  </button>
                ))}
              </div>

              <FeedCommentSection
                postId={post.id}
                commentsCount={post.comments_count}
                userId={user?.id}
                postAuthorId={post.author_id}
              />
            </div>
          );
        })}
      </div>

      <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30">
        <Plus className="w-6 h-6" />
      </button>

      {showNew && <NewPostModal onClose={() => setShowNew(false)} onSubmit={handleNewPost} />}
    </div>
  );
}
