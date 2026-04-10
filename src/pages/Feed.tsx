import { useState, useEffect, useCallback } from "react";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Plus, Bell, RefreshCw, MoreVertical, Pencil, Trash2, X, Check, Mic, Volume2 } from "lucide-react";
import { FeedCommentSection } from "@/components/mirec/FeedCommentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

// ============================================================
// TEMOIGNAGES FLASH DATA
// ============================================================
const flashTestimonies = [
  {
    id: "1",
    name: "Agathe",
    initials: "AG",
    time: "il y a 3h",
    content: "Alors la paix de Dieu qui surpasse tout...",
    verse: "Philippiens 4:6-7",
    isVocal: false,
    bgColor: "from-purple-500/30 to-blue-500/30",
  },
  {
    id: "2",
    name: "Jean Marie",
    initials: "JM",
    time: "il y a 1h",
    content: "",
    verse: "",
    isVocal: true,
    bgColor: "from-indigo-500/30 to-purple-500/30",
  },
  {
    id: "3",
    name: "Justine",
    initials: "JU",
    time: "il y a 3h",
    content: "Je rends grâce à Dieu, il a guéri ma fille",
    verse: "",
    isVocal: false,
    bgColor: "from-pink-500/30 to-purple-500/30",
  },
  {
    id: "4",
    name: "Maxime",
    initials: "M",
    time: "il y a 3h",
    content: "Dieu est fidèle! Il m'a exaucé!",
    verse: "",
    isVocal: false,
    bgColor: "from-blue-500/30 to-indigo-500/30",
  },
];

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
  image_url: string | null;
  reactions: { amen: number; feu: number; coeur: number };
  user_reactions: Record<string, boolean>;
  comments_count: number;
}

interface FeedProps {
  onTabChange?: (tab: string, state?: Record<string, any>) => void;
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
// FLASH TESTIMONY BUBBLE
// ============================================================
function FlashBubble({ testimony }: { testimony: typeof flashTestimonies[0] }) {
  return (
    <div className="flex-shrink-0 relative group cursor-pointer">
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${testimony.bgColor} blur-xl opacity-60 group-hover:opacity-80 transition-opacity`} />
      
      {/* Bubble container */}
      <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${testimony.bgColor} border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center p-2 overflow-hidden shadow-lg shadow-purple-500/20`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-1 border border-white/30">
          <span className="text-white text-xs font-bold">{testimony.initials}</span>
        </div>
        
        {/* Name and time */}
        <p className="text-white text-[10px] font-semibold truncate max-w-full">{testimony.name}</p>
        <p className="text-white/60 text-[8px]">{testimony.time}</p>
        
        {/* Content or vocal indicator */}
        {testimony.isVocal ? (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center gap-0.5">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-white/80 rounded-full animate-pulse"
                  style={{
                    height: `${4 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-white/80 text-[8px] text-center line-clamp-2 mt-0.5 px-1 italic">
            {testimony.content.slice(0, 30)}...
          </p>
        )}
        
        {testimony.verse && (
          <p className="text-amber-300/80 text-[7px] mt-0.5">{testimony.verse}</p>
        )}
      </div>
      
      {/* Amen button */}
      <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-medium shadow-lg hover:scale-105 transition-transform">
        <span>🙏</span> Amen
      </button>
    </div>
  );
}

// ============================================================
// AVATAR — cliquable, affiche juste la photo en grand
// ============================================================
function PostAvatar({ avatarUrl, initials, size = 40, onClick }: {
  avatarUrl: string | null; initials: string; size?: number; onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <button onClick={onClick}
        className="flex-shrink-0 rounded-full overflow-hidden border-2 border-border/30 hover:border-primary/50 hover:scale-105 transition-all focus:outline-none"
        style={{ width: size, height: size }}>
        <img src={avatarUrl} alt={initials} onError={() => setImgError(true)} className="w-full h-full object-cover" />
      </button>
    );
  }
  return (
    <button onClick={onClick}
      style={{ width: size, height: size, backgroundColor: "hsl(220 70% 35%)" }}
      className="rounded-full flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all focus:outline-none">
      <span style={{ fontSize: size * 0.35 }} className="text-white font-bold">{initials}</span>
    </button>
  );
}

// ============================================================
// MODAL PHOTO EN GRAND — lecture seule
// ============================================================
function PhotoModal({ avatarUrl, name, initials, onClose }: {
  avatarUrl: string | null; name: string; initials: string; onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
      <p className="text-white font-semibold text-base mb-4 opacity-90">{name}</p>
      <div
        className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
        style={{ width: 240, height: 240 }}
        onClick={e => e.stopPropagation()}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
              <span className="text-white font-bold" style={{ fontSize: 72 }}>{initials}</span>
            </div>
        }
      </div>
      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// FICHE PROFIL — lecture seule, corrigée sans erreurs 400
// ============================================================
function UserProfileModal({ userId, name, initials, avatarUrl, onClose, onViewPhoto, onTabChange }: {
  userId: string; name: string; initials: string; avatarUrl: string | null;
  onClose: () => void;
  onViewPhoto: () => void;
  onTabChange?: (tab: string, state?: Record<string, any>) => void;
}) {
  const [profile, setProfile]     = useState<any>(null);
  const [skills, setSkills]       = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    if (!userId) return;

    // Charger profil
    supabase
      .from("profiles")
      .select("full_name, username, points_total, streak_days, role, quartier, bio, cover_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoadingProfile(false);
      });

    // Nombre de posts — requête simple sans head:true pour éviter 400
    supabase
      .from("posts")
      .select("id")
      .eq("author_id", userId)
      .then(({ data }) => { setPostCount(data?.length || 0); });

    // Compétences
    (supabase
      .from("member_skills" as any)
      .select("skill, level")
      .eq("profile_id", userId)
      .limit(5) as any)
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

  const pts   = profile?.points_total || 0;
  const level = LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[0];

  const SKILL_COLORS: Record<string, string> = {
    debutant: "#6B7280", intermediaire: "#D97706",
    avance: "#059669", expert: "#1A4B9B", professionnel: "#7C3AED",
  };

  const handleMessage = () => {
    onClose();
    onTabChange?.("inbox", { openConversationWith: userId, userName: name, avatarUrl });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Cover photo + avatar header */}
        <div className="relative">
          {/* Cover photo banner */}
          <div className="w-full h-28 bg-gradient-to-br from-primary/30 via-primary/10 to-muted overflow-hidden rounded-t-none">
            {profile?.cover_url && (
              <img src={profile.cover_url} alt="Couverture" className="w-full h-full object-cover" />
            )}
          </div>
          {/* Close button overlay */}
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm">
            <X className="w-4 h-4 text-white" />
          </button>
          {/* Avatar overlapping cover */}
          <div className="px-5 -mt-8 flex items-end justify-between pb-3 border-b border-border/30">
            <button onClick={onViewPhoto} className="rounded-full focus:outline-none ring-3 ring-card hover:scale-105 transition-all flex-shrink-0"
              style={{ width: 64, height: 64 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full border-3 border-card" style={{ borderWidth: 3, borderColor: "var(--card)" }} />
                : <div className="w-full h-full rounded-full flex items-center justify-center border-[3px] border-card" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                    <span className="text-white font-bold text-xl">{initials}</span>
                  </div>
              }
            </button>
            <div className="flex-1 min-w-0 ml-3 pt-8">
              <h3 className="font-bold text-base text-foreground truncate leading-tight">{name}</h3>
              {profile?.username && (
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              )}
              {profile?.role && profile.role !== "membre" && (
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {profile.role === "pasteur" ? "⛪ Pasteur"
                    : profile.role === "diacre" ? "🤝 Diacre"
                    : profile.role === "admin" ? "🛡 Admin"
                    : profile.role}
                </span>
              )}
            </div>
          </div>
          {/* Bio */}
          {profile?.bio && (
            <div className="px-5 py-2.5 border-b border-border/30">
              <p className="text-sm text-foreground/80 leading-snug">{profile.bio}</p>
            </div>
          )}
        </div>

        {loadingProfile ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border/30">
              {[
                { val: postCount,                  label: "Posts"  },
                { val: pts,                        label: "Points" },
                { val: `${profile?.streak_days || 0}🔥`, label: "Streak" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="font-bold text-lg text-foreground">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Niveau spirituel */}
            <div className="px-5 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{level.icon}</span>
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
                    <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: SKILL_COLORS[s.level] || "#6B7280", backgroundColor: (SKILL_COLORS[s.level] || "#6B7280") + "18" }}>
                      {s.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bouton message */}
        <div className="px-5 py-4">
          <button
            onClick={handleMessage}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            💬 Envoyer un message
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FEED PRINCIPAL
// ============================================================
export default function Feed({ onTabChange }: FeedProps) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [filter, setFilter]       = useState("all");
  const [menuOpen, setMenuOpen]   = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const [photoModal, setPhotoModal]     = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [profileModal, setProfileModal] = useState<{ userId: string; name: string; initials: string; avatar: string | null } | null>(null);

  const filters = [
    { key: "all",          label: "Tout"          },
    { key: "announcement", label: "📢 Annonces"   },
    { key: "testimony",    label: "✨ Témoignages" },
    { key: "prayer",       label: "🙏 Prières"    },
    { key: "verse",        label: "📖 Versets"    },
  ];

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    // Try fetching with image_url (requires migration), fall back without
    let result = await supabase
      .from("posts").select("id, content, type, created_at, author_id, image_url")
      .order("created_at", { ascending: false }).limit(50);

    if (result.error) {
      result = await supabase
        .from("posts").select("id, content, type, created_at, author_id")
        .order("created_at", { ascending: false }).limit(50);
    }

    const { data: postsData, error } = result;
    if (error || !postsData) { setLoading(false); setRefreshing(false); return; }

    const authorIds = [...new Set(postsData.map(p => p.author_id).filter(Boolean))];
    let profileMap: Record<string, { name: string; avatar: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
      profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.id, {
          name:   p.full_name || "Membre MIREC",
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
      const pr = allReactions?.filter(r => r.content_id === post.id) || [];
      const reactions = { amen: 0, feu: 0, coeur: 0 };
      const user_reactions: Record<string, boolean> = {};
      pr.forEach(r => {
        if (r.type in reactions) reactions[r.type as keyof typeof reactions]++;
        if (r.author_id === user?.id) user_reactions[r.type] = true;
      });
      const p    = profileMap[post.author_id];
      const name = p?.name || "Membre MIREC";
      return {
        ...post, type: post.type || "post",
        author_name: name,
        author_initials: name.slice(0, 2).toUpperCase(),
        author_avatar: p?.avatar || null,
        image_url: (post as any).image_url || null,
        reactions, user_reactions,
        comments_count: commentCounts[post.id] || 0,
      };
    });

    setPosts(enriched);
    setLoading(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleReact = async (postId: string, key: "amen" | "feu" | "coeur") => {
    if (!user) { navigate("/auth"); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasActive = post.user_reactions[key];
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      reactions:      { ...p.reactions,      [key]: p.reactions[key] + (wasActive ? -1 : 1) },
      user_reactions: { ...p.user_reactions, [key]: !wasActive },
    }));
    if (wasActive) {
      await supabase.from("reactions").delete().eq("content_id", postId).eq("author_id", user.id).eq("type", key);
    } else {
      await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: key });
    }
  };

  const handleNewPost = async (data: { content: string; type: string; imageUrl?: string }) => {
    if (!user) { navigate("/auth"); return; }
    const payload: Record<string, string> = { content: data.content, type: data.type, author_id: user.id };
    if (data.imageUrl) payload.image_url = data.imageUrl;
    const { error } = await supabase.from("posts").insert(payload);
    if (!error) fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setMenuOpen(null);
    await supabase.from("reactions").delete().eq("content_id", postId);
    await supabase.from("posts").delete().eq("id", postId);
  };

  const startEdit = (post: FeedPost) => { setEditingPost(post.id); setEditContent(post.content); setMenuOpen(null); };
  const saveEdit  = async (postId: string) => {
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
            <button onClick={() => fetchPosts(true)} disabled={refreshing} className="p-2 rounded-full hover:bg-muted transition-colors">
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* TEMOIGNAGES FLASH SECTION - Design lumineux avec bulles */}
      {/* ============================================================ */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      
      <div className="relative h-[340px] overflow-hidden" style={{
        background: "linear-gradient(180deg, #0a0a1a 0%, #1a1035 50%, #0f0a20 100%)",
      }}>
        {/* ETOILES SCINTILLANTES */}
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: "#fff",
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
        
        {/* Title */}
        <h2 className="text-center text-white font-semibold text-lg pt-4 mb-2 drop-shadow-lg">
          Temoignages Flash
        </h2>
        
        {/* BULLES CIRCULAIRES LUMINEUSES - Positionnees organiquement */}
        <div className="relative h-[280px]">
          {flashTestimonies.map((testimony, i) => {
            const positions = [
              { x: 15, y: 25, size: 100 },
              { x: 40, y: 15, size: 110 },
              { x: 75, y: 30, size: 95 },
              { x: 88, y: 18, size: 85 },
            ];
            const pos = positions[i] || positions[0];
            
            return (
              <div
                key={testimony.id}
                className="absolute flex flex-col items-center cursor-pointer"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  animation: `float ${4 + Math.random() * 2}s ease-in-out infinite`,
                }}
              >
                {/* Outer glow ring */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: pos.size + 30,
                    height: pos.size + 30,
                    background: "radial-gradient(circle, rgba(147,112,219,0.4) 0%, rgba(138,43,226,0.2) 40%, transparent 70%)",
                    animation: "pulse-glow 3s ease-in-out infinite",
                  }}
                />
                
                {/* Inner glow ring */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: pos.size + 16,
                    height: pos.size + 16,
                    border: "2px solid rgba(186,85,211,0.5)",
                    boxShadow: "0 0 20px rgba(186,85,211,0.4), inset 0 0 20px rgba(186,85,211,0.2)",
                  }}
                />

                {/* Main bubble */}
                <div
                  className="relative rounded-full overflow-hidden flex flex-col items-center justify-center transition-transform duration-300 hover:scale-110"
                  style={{
                    width: pos.size,
                    height: pos.size,
                    background: "linear-gradient(145deg, rgba(25,25,50,0.9) 0%, rgba(40,30,80,0.8) 100%)",
                    border: "2px solid rgba(186,85,211,0.6)",
                    boxShadow: "0 0 20px rgba(186,85,211,0.3)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="rounded-full overflow-hidden border-2 border-purple-400/50 mb-1 flex items-center justify-center"
                    style={{ width: pos.size * 0.35, height: pos.size * 0.35, background: "linear-gradient(135deg, #9333ea, #3b82f6)" }}
                  >
                    <span className="text-white font-bold text-xs">{testimony.initials}</span>
                  </div>
                  
                  {/* Name */}
                  <p className="text-[10px] font-semibold text-white/90 text-center px-1 truncate w-full">
                    {testimony.name}
                  </p>
                  <p className="text-[8px] text-purple-300/70">{testimony.time}</p>
                </div>

                {/* Preview text below bubble */}
                <div className="mt-2 max-w-[100px] text-center">
                  {testimony.isVocal ? (
                    <p className="text-[9px] text-purple-200/80 italic">Temoignage vocal</p>
                  ) : (
                    <p className="text-[9px] text-purple-200/80 italic line-clamp-2 leading-tight">
                      {testimony.content.slice(0, 40)}...
                    </p>
                  )}
                  {testimony.verse && (
                    <p className="text-[8px] text-yellow-400/70 mt-0.5">{testimony.verse}</p>
                  )}
                </div>

                {/* Amen button */}
                <button
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 active:scale-90"
                  style={{
                    background: "linear-gradient(135deg, #059669, #14b8a6)",
                    color: "#fff",
                    border: "1px solid rgba(5,150,105,0.5)",
                    boxShadow: "0 0 10px rgba(5,150,105,0.4)",
                  }}
                >
                  <span>🙏</span> Amen
                </button>
              </div>
            );
          })}
          
          {/* Central decorative message */}
          <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 text-center pointer-events-none">
            <p className="text-purple-300/50 text-xs italic">Merci Seigneur pour cette journee benie !</p>
            <button className="mt-2 flex items-center gap-1 px-3 py-1 mx-auto rounded-full text-white text-xs font-medium shadow-lg hover:scale-105 transition-transform pointer-events-auto"
              style={{ background: "linear-gradient(135deg, #059669, #14b8a6)" }}>
              <span>🙏</span> Amen
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTERS */}
      {/* ============================================================ */}
      <div className="sticky top-[61px] z-20 bg-background/80 backdrop-blur-md px-4 py-2.5 border-b border-border/30">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
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
          <div className="text-center py-12 text-muted-foreground text-sm">Aucun post dans cette catégorie.</div>
        ) : filtered.map(post => {
          const tc       = typeConfig(post.type);
          const isAuthor = user?.id === post.author_id;
          const isEditing = editingPost === post.id;

          return (
            <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">

                {/* AVATAR → photo en grand (lecture seule) */}
                <PostAvatar
                  avatarUrl={post.author_avatar}
                  initials={post.author_initials}
                  size={40}
                  onClick={() => setPhotoModal({
                    url:      post.author_avatar,
                    name:     post.author_name,
                    initials: post.author_initials,
                  })}
                />

                <div className="flex-1 min-w-0">
                  {/* NOM → fiche profil */}
                  <button
                    onClick={() => setProfileModal({
                      userId:   post.author_id,
                      name:     post.author_name,
                      initials: post.author_initials,
                      avatar:   post.author_avatar,
                    })}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left block truncate max-w-full">
                    {post.author_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at || "")}</p>
                </div>

                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${tc.textClass} ${tc.bgClass}`}>
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
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} />
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
                <div className="mb-4 space-y-3">
                  {post.content && (
                    <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                  )}
                  {post.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border/50">
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setPhotoModal({ url: post.image_url, name: post.author_name, initials: post.author_initials })}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-border/30">
                {([
                  { key: "amen"  as const, emoji: "🙏" },
                  { key: "feu"   as const, emoji: "🔥" },
                  { key: "coeur" as const, emoji: "❤️" },
                ]).map(r => (
                  <button key={r.key} onClick={() => handleReact(post.id, r.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      post.user_reactions[r.key]
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    <span>{r.emoji}</span>
                    <span>{post.reactions[r.key]}</span>
                  </button>
                ))}
              </div>

              <FeedCommentSection postId={post.id} commentsCount={post.comments_count} userId={user?.id} postAuthorId={post.author_id} />
            </div>
          );
        })}
      </div>

      <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30">
        <Plus className="w-6 h-6" />
      </button>

      {showNew && <NewPostModal onClose={() => setShowNew(false)} onSubmit={handleNewPost} />}

      {/* MODAL PHOTO — lecture seule pour tout le monde */}
      {photoModal && (
        <PhotoModal
          avatarUrl={photoModal.url}
          name={photoModal.name}
          initials={photoModal.initials}
          onClose={() => setPhotoModal(null)}
        />
      )}

      {/* FICHE PROFIL */}
      {profileModal && (
        <UserProfileModal
          userId={profileModal.userId}
          name={profileModal.name}
          initials={profileModal.initials}
          avatarUrl={profileModal.avatar}
          onTabChange={onTabChange}
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
