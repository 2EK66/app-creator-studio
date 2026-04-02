import { useState } from "react";
import { PostCard } from "@/components/mirec/PostCard";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { mockPosts, type Post } from "@/lib/mockData";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Plus, Bell } from "lucide-react";

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filters = [
    { key: "all", label: "Tout" },
    { key: "announcement", label: "📢 Annonces" },
    { key: "testimony", label: "✨ Témoignages" },
    { key: "prayer", label: "🙏 Prières" },
    { key: "verse", label: "📖 Versets" },
  ];

  const filtered = filter === "all" ? posts : posts.filter((p) => p.type === filter);

  const handleReact = (postId: string, key: "amen" | "feu" | "coeur") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const wasActive = p.user_reactions?.[key];
        return {
          ...p,
          reactions: { ...p.reactions, [key]: p.reactions[key] + (wasActive ? -1 : 1) },
          user_reactions: { ...p.user_reactions, [key]: !wasActive },
        };
      })
    );
  };

  const handleAddComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newComment = {
          id: String(Date.now()),
          content: text,
          profiles: { full_name: "Moi", role: "membre" as const, avatar_initials: "ME", avatar_color: "#7C3AED" },
        };
        return {
          ...p,
          comments: [...p.comments, newComment],
          comments_count: p.comments_count + 1,
        };
      })
    );
  };

  const handleNewPost = async (data: { content: string; type: string }) => {
    const newPost: Post = {
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      content: data.content,
      type: data.type as Post["type"],
      is_official: false,
      is_pinned: false,
      media_url: null,
      profiles: { full_name: "Grace Dossou", role: "membre", avatar_initials: "GD", avatar_color: "#7C3AED" },
      reactions: { amen: 0, feu: 0, coeur: 0 },
      user_reactions: {},
      comments_count: 0,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MirecLogo size={36} />
            <h1 className="font-display text-xl font-bold tracking-wide text-foreground">MIREC</h1>
          </div>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-[61px] z-20 bg-background/80 backdrop-blur-md px-4 py-2.5 border-b border-border/30">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} onReact={handleReact} onAddComment={handleAddComment} />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucun post dans cette catégorie.
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNew(true)}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full bg-gradient-to-br from-mirec-800 to-mirec-900 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showNew && <NewPostModal onClose={() => setShowNew(false)} onSubmit={handleNewPost} />}
    </div>
  );
}
