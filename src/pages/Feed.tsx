import { useState, useEffect, useCallback } from "react";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Plus, Bell, RefreshCw, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { FeedCommentSection } from "@/components/mirec/FeedCommentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

// ============================================================
// TYPES
// ============================================================
interface FeedPost {
  id: string;
  created_at: string;
  content: string;
  type: string;
  author_id: string;
  author_name: string;
  author_initials: string;
  author_avatar: string | null;
  reactions: { amen: number; feu: number; coeur: number };
  user_reactions: Record<string, boolean>;
  comments_count: number;
}

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function typeConfig(type: string) {
  const map: Record<string, { label: string; textClass: string; bgClass: string }> = {
    prayer:       { label: "🙏 Prière",        textClass: "text-purple-600",  bgClass: "bg-purple-50 dark:bg-purple-950/30"   },
    testimony:    { label: "✨ Témoignage",     textClass: "text-emerald-600", bgClass: "bg-emerald-50 dark:bg-emerald-950/30" },
    announcement: { label: "📢 Annonce",        textClass: "text-primary",     bgClass: "bg-primary/5"                         },
    verse:        { label: "📖 Verset du jour", textClass: "text-amber-600",   bgClass: "bg-amber-50 dark:bg-amber-950/30"     },
  };
  return map[type] || { label: "💬 Post", textClass: "text-muted-foreground", bgClass: "bg-muted" };
}

function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
}

// ============================================================
// COMPOSANT AVATAR CLIQUABLE
// ============================================================
function PostAvatar({
  avatarUrl, initials, size = 40, onClick
}: {
  avatarUrl: string | null;
  initials: string;
  size?: number;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <button
        onClick={onClick}
        className="flex-shrink-0 rounded-full overflow-hidden border-2 border-border/30 hover:border-primary/60 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
        style={{ width: size, height: size }}
        title="Voir la photo"
      >
        <img
          src={avatarUrl}
          alt={initials}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{ width: size, height: size, backgroundColor: "hsl(220 70% 35%)" }}
      className="rounded-full flex items-center justify-center flex-shrink-0 hover:brightness-110 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      title="Voir le profil"
    >
      <span style={{ fontSize: size * 0.35 }} className="text-white font-bold">{initials}</span>
    </button>
  );
}

// ============================================================
// MODAL PHOTO EN GRAND
// ============================================================
function PhotoModal({
  avatarUrl, name, initials, onClose
}: {
  avatarUrl: string | null;
  name: string;
  initials: string;
  onClose: () => void;
}) {
  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Nom en haut */}
      <p className="text-white font-semibold text-base mb-4 opacity-90">{name}</p>

      {/* Photo ou initiales en grand */}
      <div
        className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
        style={{ width: 240, height: 240 }}
        onClick={e => e.stopPropagation()}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: "hsl(220 70% 35%)" }}
          >
            <span className="text-white font-bold" style={{ fontSize: 80 }}>{initials}</span>
          </div>
        )}
      </div>

      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// MODAL PROFIL UTILISATEUR
// ============================================================
function UserProfileModal({
  userId, name, initials, avatarUrl, onClose, onViewPhoto
}: {
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  onClose: () => void;
  onViewPhoto: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    // Charger le profil
    supabase.from("profiles")
      .select("full_name, username, points_total, streak_days, role, quartier, created_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });

    // Nombre de posts
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId)
      .then(({ count }) => { if (count !== null) setPostCount(count); });

    // Compétences
    (supabase.from("member_skills" as any).select("skill, level").eq("profile_id", userId).limit(5) as any)
      .then(({ data }: any) => { if (data) setSkills(data); });
  }, [userId]);

  const LEVELS = [
    { name: "Nouveau croyant", min: 0,    max: 200,   icon: "🌱" },
    { name: "Disciple",        min: 200,  max: 600,   icon: "📖" },
    { name: "Serviteur",       min: 600,  max: 1500,  icon: "🙏" },
    { name: "Évangéliste",     min: 1500, max: 3000,  icon: "📣" },
    { name: "Ancien",          min: 3000, max: 6000,  icon: "⭐" },
    { name: "Prophète",        min: 6000, max: 99999, icon: "🏆" },
  ];

  const pts = profile?.points_total || 0;
  const level = LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[LEVELS.length - 1];

  const SKILL_COLORS: Record<string, string> = {
    debutant: "#6B7280", intermediaire: "#D97706",
    avance: "#059669", expert: "#1A4B9B", professionnel: "#7C3AED",
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Barre handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header avec avatar + infos */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/30">
          <button onClick={onViewPhoto} className="flex-shrink-0 rounded-full overflow-hidden border-3 border-primary/20 hover:border-primary/60 hover:scale-105 transition-all"
            style={{ width: 64, height: 64 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground">{name}</h3>
            {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
            {profile?.role && profile.role !== "membre" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {profile.role === "pasteur" ? "⛪ Pasteur" : profile.role === "diacre" ? "🤝 Diacre" : profile.role}
              </span>
            )}
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border/30">
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{postCount}</p>
            <p className="text-[10px] text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{pts}</p>
            <p className="text-[10px] text-muted-foreground">Points</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{profile?.streak_days || 0}🔥</p>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
        </div>

        {/* Niveau spirituel */}
        <div className="px-5 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">{level.icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{level.name}</p>
              <p className="text-[10px] text-muted-foreground">{pts} points</p>
            </div>
          </div>
        </div>

        {/* Quartier */}
        {profile?.quartier && (
          <div className="px-5 py-3 border-b border-border/30">
            <p className="text-xs text-muted-foreground">📍 {profile.quartier}</p>
          </div>
        )}

        {/* Compétences */}
        {skills.length > 0 && (
          <div className="px-5 py-3 border-b border-border/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">💼 Compétences</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: any, i: number) => (
                <span key={i}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    color: SKILL_COLORS[s.level] || "#6B7280",
                    backgroundColor: (SKILL_COLORS[s.level] || "#6B7280") + "18"
                  }}>
                  {s.skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bouton message */}
        <div className="px-5 py-4">
          <button
            onClick={() => { navigate("/messages"); onClose(); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            💬 Envoyer un message
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL FEED
// ============================================================
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

  // Modals
  const [photoModal, setPhotoModal] = useState<{
    url: string | null; name: string; initials: string
  } | null>(null);
  const [profileModal, setProfileModal] = useState<{
    userId: string; name: string; initials: string; avatar: string | null
  } | null>(null);

  const filters = [
    { key: "all",          label: "Tout"           },
    { key: "announcement", label: "📢 Annonces"    },
    { key: "testimony",    label: "✨ Témoignages"  },
    { key: "prayer",       label: "🙏 Prières"     },
    { key: "verse",        label: "📖 Versets"     },
  ];

  // ---- Charger les posts ----
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("id, content, type, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !postsData) {
      console.error("Erreur chargement posts:", error);
      setLoading(false); setRefreshing(false); return;
    }

    const authorIds = [...new Set(postsData.map(p => p.author_id).filter(Boolean))];
    let profileMap: Record<string, { name: string; avatar: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
      profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.id, {
          name: p.full_name || "Membre MIREC",
          avatar: getAvatarUrl(p.avatar_url),
        }])
      );
    }

    const postIds = postsData.map(p => p.id);
    const { data: allReactions } = await supabase
      .from("reactions").select("content_id, type, author_id").in("content_id", postIds);

    const { data: allComments } = await supabase
      .from("comments").select("post_id").in("post_id", postIds);

    const commentCounts: Record<string, number> = {};
    (allComments || []).forEach(c => {
      if (c.post_id) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });

    const enriched: FeedPost[] = postsData.map(post => {
      const postReactions = allReactions?.filter(r => r.content_id === post.id) || [];
      const reactions = { amen: 0, feu: 0, coeur: 0 };
      const user_reactions: Record<string, boolean> = {};
      postReactions.forEach(r => {
        if (r.type in reactions) reactions[r.type as keyof typeof reactions]++;
        if (r.author_id === user?.id) user_reactions[r.type] = true;
      });
      const profile = profileMap[post.author_id];
      const name = profile?.name || "Membre MIREC";
      return {
        ...post, type: post.type || "post",
        author_name: name,
        author_initials: name.slice(0, 2).toUpperCase(),
        author_avatar: profile?.avatar || null,
        reactions, user_reactions,
        comments_count: commentCounts[post.id] || 0,
      };
    });

    setPosts(enriched);
    setLoading(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ---- Réactions ----
  const handleReact = async (postId: string, key: "amen" | "feu" | "coeur") => {
    if (!user) { navigate("/auth"); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasActive = post.user_reactions[key];
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      reactions: { ...p.reactions, [key]: p.reactions[key] + (wasActive ? -1 : 1) },
      user_reactions: { ...p.user_reactions, [key]: !wasActive },
    }));
    if (wasActive) {
      await supabase.from("reactions").delete().eq("content_id", postId).eq("author_id", user.id).eq("type", key);
    } else {
      await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: key });
    }
  };

  // ---- Nouveau post ----
  const handleNewPost = async (data: { content: string; type: string }) => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("posts").insert({
      content: data.content, type: data.type, author_id: user.id,
    });
    if (error) { console.error("Erreur création post:", error); return; }
    fetchPosts();
  };

  // ---- Supprimer ----
  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setMenuOpen(null);
    await supabase.from("reactions").delete().eq("content_id", postId);
    await supabase.from("posts").delete().eq("id", postId);
  };

  const startEdit = (post: FeedPost) => { setEditingPost(post.id); setEditContent(post.content); setMenuOpen(null); };
  const saveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
    setEditingPost(null);
    await supabase.from("posts").update({ content: editContent.trim() }).eq("id", postId);
  };

  // ---- Ouvrir photo ----
  const openPhoto = (post: FeedPost) => {
    setPhotoModal({ url: post.author_avatar, name: post.author_name, initials: post.author_initials });
  };

  // ---- Ouvrir profil ----
  const openProfile = (post: FeedPost) => {
    setProfileModal({ userId: post.author_id, name: post.author_name, initials: post.author_initials, avatar: post.author_avatar });
  };

  const filtered = filter === "all" ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* HEADER */}
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

      {/* FILTRES */}
      <div className="sticky top-[61px] z-20 bg-background/80 backdrop-blur-md px-4 py-2.5 border-b border-border/30">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE POSTS */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucun post dans cette catégorie.
          </div>
        ) : filtered.map(post => {
          const tc = typeConfig(post.type);
          const isAuthor = user?.id === post.author_id;
          const isEditing = editingPost === post.id;

          return (
            <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">

              {/* Header post */}
              <div className="flex items-center gap-3 mb-3">

                {/* AVATAR — clic → affiche photo en grand */}
                <PostAvatar
                  avatarUrl={post.author_avatar}
                  initials={post.author_initials}
                  size={40}
                  onClick={() => openPhoto(post)}
                />

                <div className="flex-1 min-w-0">
                  {/* NOM — clic → ouvre fiche profil */}
                  <button
                    onClick={() => openProfile(post)}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left"
                  >
                    {post.author_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at || "")}</p>
                </div>

                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tc.textClass} ${tc.bgClass}`}>
                  {tc.label}
                </span>

                {/* Menu auteur */}
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

              {/* Contenu */}
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

              {/* Réactions */}
              <div className="flex gap-2 pt-3 border-t border-border/30">
                {([
                  { key: "amen"  as const, emoji: "🙏", label: "Amen" },
                  { key: "feu"   as const, emoji: "🔥", label: "Feu"  },
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

      {/* FAB */}
      <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30">
        <Plus className="w-6 h-6" />
      </button>

      {/* MODAL NOUVEAU POST */}
      {showNew && <NewPostModal onClose={() => setShowNew(false)} onSubmit={handleNewPost} />}

      {/* MODAL PHOTO EN GRAND */}
      {photoModal && (
        <PhotoModal
          avatarUrl={photoModal.url}
          name={photoModal.name}
          initials={photoModal.initials}
          onClose={() => setPhotoModal(null)}
        />
      )}

      {/* MODAL PROFIL UTILISATEUR */}
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          name={profileModal.name}
          initials={profileModal.initials}
          avatarUrl={profileModal.avatar}
          onClose={() => setProfileModal(null)}
          onViewPhoto={() => {
            setPhotoModal({ url: profileModal.avatar, name: profileModal.name, initials: profileModal.initials });
            setProfileModal(null);
          }}
        />
      )}
    </div>
  );
}
