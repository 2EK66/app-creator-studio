import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Plus, X, Mic, Send, RefreshCw, Bell, Menu, MessageCircle, Heart, Eye } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface Flash {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  type: "text" | "audio" | "verse";
  created_at: string;
  amen_count: number;
  my_amen: boolean;
  is_read: boolean;
}

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  type: string;
  created_at: string;
  amen_count: number;
  heart_count: number;
  comment_count: number;
  view_count: number;
  my_amen: boolean;
  image_url?: string | null;
}

// ============================================================
// UTILITAIRES
// ============================================================
function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Il y a " + Math.floor(diff / 60000) + "min";
  if (h < 24) return "Il y a " + h + "h";
  return "Il y a " + Math.floor(h / 24) + "j";
}

// ============================================================
// PARTICULES AMEN
// ============================================================
function AmenParticles({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 2 * Math.PI;
    const dist = 40 + Math.random() * 30;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    return { tx, ty };
  });

  return (
    <div className="fixed pointer-events-none z-[200]" style={{ left: x, top: y }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-yellow-400"
          style={{
            animation: `amen-particle 0.9s ease-out forwards`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animationDelay: `${i * 30}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ============================================================
// BULLE FLASH CIRCULAIRE LUMINEUSE
// ============================================================
function FlashBubble({
  flash,
  position,
  onOpen,
  onAmen,
}: {
  flash: Flash;
  position: { x: number; y: number; size: number };
  onOpen: (f: Flash) => void;
  onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const initials = flash.author_name.slice(0, 2).toUpperCase();
  const dim = position.size;

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
        animation: `float ${4 + Math.random() * 2}s ease-in-out infinite`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(flash)}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: dim + 30,
          height: dim + 30,
          background: "radial-gradient(circle, rgba(147,112,219,0.4) 0%, rgba(138,43,226,0.2) 40%, transparent 70%)",
          animation: "pulse-glow 3s ease-in-out infinite",
        }}
      />
      
      {/* Inner glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: dim + 16,
          height: dim + 16,
          border: "2px solid rgba(186,85,211,0.5)",
          boxShadow: "0 0 20px rgba(186,85,211,0.4), inset 0 0 20px rgba(186,85,211,0.2)",
        }}
      />

      {/* Main bubble */}
      <div
        className="relative rounded-full overflow-hidden flex flex-col items-center justify-center transition-transform duration-300"
        style={{
          width: dim,
          height: dim,
          background: "linear-gradient(145deg, rgba(25,25,50,0.9) 0%, rgba(40,30,80,0.8) 100%)",
          border: "2px solid rgba(186,85,211,0.6)",
          boxShadow: hovered
            ? "0 0 30px rgba(186,85,211,0.6), 0 0 60px rgba(138,43,226,0.4)"
            : "0 0 20px rgba(186,85,211,0.3)",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        {/* Avatar */}
        <div
          className="rounded-full overflow-hidden border-2 border-purple-400/50 mb-1"
          style={{ width: dim * 0.4, height: dim * 0.4 }}
        >
          {flash.author_avatar ? (
            <img src={flash.author_avatar} alt={initials} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
          )}
        </div>
        
        {/* Name */}
        <p className="text-[10px] font-semibold text-white/90 text-center px-1 truncate w-full">
          {flash.author_name.split(" ")[0]}
        </p>
        <p className="text-[8px] text-purple-300/70">{timeAgo(flash.created_at)}</p>
      </div>

      {/* Preview text below bubble */}
      <div className="mt-2 max-w-[100px] text-center">
        <p className="text-[9px] text-purple-200/80 italic line-clamp-2 leading-tight">
          {flash.type === "audio" ? "Temoignage vocal" : flash.content.slice(0, 50) + "..."}
        </p>
        {flash.type === "verse" && (
          <p className="text-[8px] text-yellow-400/70 mt-0.5">Philippiens 4:6-7</p>
        )}
      </div>

      {/* Amen button */}
      <button
        onClick={(e) => { e.stopPropagation(); onAmen(flash.id, e); }}
        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 active:scale-90"
        style={{
          background: flash.my_amen
            ? "linear-gradient(135deg, #9333ea, #3b82f6)"
            : "rgba(255,255,255,0.1)",
          color: "#fff",
          border: "1px solid rgba(186,85,211,0.5)",
          boxShadow: flash.my_amen ? "0 0 15px rgba(147,51,234,0.5)" : "none",
        }}
      >
        <span className="text-yellow-400">🙏</span> Amen
      </button>
    </div>
  );
}

// ============================================================
// MODAL DETAIL DU FLASH
// ============================================================
function FlashDetail({ flash, onClose, onAmen }: {
  flash: Flash; onClose: () => void; onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6"
        style={{
          background: "linear-gradient(160deg, rgba(40,20,80,0.95), rgba(20,10,40,0.98))",
          border: "1px solid rgba(186,85,211,0.4)",
          boxShadow: "0 0 40px rgba(138,43,226,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-400">
            {flash.author_avatar
              ? <img src={flash.author_avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
                  <span className="text-white font-bold">{flash.author_name.slice(0, 2).toUpperCase()}</span>
                </div>
            }
          </div>
          <div>
            <p className="font-bold text-white">{flash.author_name}</p>
            <p className="text-xs text-purple-300/70">{timeAgo(flash.created_at)}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-4">
          <p className="text-white/90 leading-relaxed text-sm italic">{flash.content}</p>
        </div>

        <button
          onClick={(e) => onAmen(flash.id, e)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm"
          style={{
            background: flash.my_amen
              ? "linear-gradient(135deg, #9333ea, #3b82f6)"
              : "rgba(255,255,255,0.1)",
            color: "#fff",
            border: "1px solid rgba(186,85,211,0.5)",
          }}
        >
          <span className="text-yellow-400">🙏</span> {flash.my_amen ? "Amen !" : "Dire Amen"} ({flash.amen_count})
        </button>
      </div>
    </div>
  );
}

// ============================================================
// POST CARD
// ============================================================
function PostCard({ post, onAmen }: { post: Post; onAmen: (id: string, e: React.MouseEvent) => void }) {
  const initials = post.author_name.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: "linear-gradient(160deg, rgba(30,20,60,0.95), rgba(15,10,35,0.98))",
      border: "1px solid rgba(186,85,211,0.3)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-400/50">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                <span className="text-white font-bold text-xs">{initials}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{post.author_name}</p>
            <p className="text-[10px] text-purple-300/60">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <span className="text-purple-400/60 text-xs">Post</span>
      </div>

      {/* Content */}
      {post.image_url && (
        <div className="relative mx-4 rounded-xl overflow-hidden mb-3">
          <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      
      <div className="px-4 pb-3">
        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap italic">
          {post.content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={(e) => onAmen(post.id, e)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
          style={{
            background: post.my_amen
              ? "linear-gradient(135deg, #9333ea, #3b82f6)"
              : "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(186,85,211,0.4)",
          }}
        >
          <span className="text-yellow-400">🙏</span> Amen
        </button>
        
        <div className="flex items-center gap-3 ml-auto text-purple-300/60 text-xs">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" /> {post.heart_count}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NOUVEAU FLASH MODAL
// ============================================================
function NewFlashModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { content: string; type: "text" | "verse" }) => Promise<void>;
}) {
  const [type, setType] = useState<"text" | "verse">("text");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await onSubmit({ content: content.trim(), type });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        style={{
          background: "linear-gradient(160deg, rgba(40,20,80,0.98), rgba(20,10,40,0.99))",
          border: "1px solid rgba(186,85,211,0.3)",
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">Nouveau Temoignage Flash</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex gap-2">
          {["text", "verse"].map(t => (
            <button key={t} onClick={() => setType(t as "text" | "verse")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === t ? "bg-purple-600 text-white" : "bg-white/10 text-white/60"}`}>
              {t === "text" ? "Temoignage" : "Verset"}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={280}
          placeholder="Partage ta victoire, ta gratitude..."
          rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-purple-500/30 text-white text-sm outline-none focus:border-purple-400 resize-none placeholder:text-white/40"
        />

        <div className="flex gap-2 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/20 text-sm text-white/60">Annuler</button>
          <button onClick={handleSubmit} disabled={saving || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Publier</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL - PAGE LOUNGE
// ============================================================
export default function Louange() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedFlash, setSelectedFlash] = useState<Flash | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeFilter, setActiveFilter] = useState("tout");
  const particleId = useRef(0);

  const filters = [
    { key: "tout", label: "Tout" },
    { key: "annonces", label: "Annonces", icon: "📢" },
    { key: "temoignages", label: "Temoignages", icon: "✨" },
    { key: "prieres", label: "Prieres", icon: "🙏" },
    { key: "versets", label: "Versets", icon: "📖" },
  ];

  // Positions des bulles (en pourcentage)
  const bubblePositions = [
    { x: 15, y: 30, size: 90 },
    { x: 38, y: 20, size: 100 },
    { x: 75, y: 35, size: 85 },
    { x: 90, y: 25, size: 80 },
    { x: 55, y: 55, size: 95 },
  ];

  // Charger les flashes et posts
  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Fetch flashes (temoignages des 24h)
    const { data: flashPosts } = await supabase
      .from("posts")
      .select("id, content, type, created_at, author_id")
      .in("type", ["testimony", "verse", "flash"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch regular posts
    const { data: regularPosts } = await supabase
      .from("posts")
      .select("id, content, type, created_at, author_id, image_url")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get profiles
    const allAuthorIds = [...new Set([
      ...(flashPosts || []).map(p => p.author_id),
      ...(regularPosts || []).map(p => p.author_id)
    ])];
    
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, avatar_url").in("id", allAuthorIds);
    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, { name: p.full_name || "Membre", avatar: getAvatarUrl(p.avatar_url) }])
    );

    // Get reactions
    const allPostIds = [...(flashPosts || []), ...(regularPosts || [])].map(p => p.id);
    const { data: reactions } = await supabase
      .from("reactions").select("content_id, author_id, type")
      .in("content_id", allPostIds);

    // Process flashes
    const enrichedFlashes: Flash[] = (flashPosts || []).map(post => {
      const prof = profileMap[post.author_id] || { name: "Membre", avatar: null };
      const amens = reactions?.filter(r => r.content_id === post.id && r.type === "amen") || [];
      return {
        id: post.id,
        author_id: post.author_id,
        author_name: prof.name,
        author_avatar: prof.avatar,
        content: post.content,
        type: (post.type === "verse" ? "verse" : "text") as "text" | "audio" | "verse",
        created_at: post.created_at,
        amen_count: amens.length,
        my_amen: amens.some(r => r.author_id === user?.id),
        is_read: false,
      };
    });

    // Process posts
    const enrichedPosts: Post[] = (regularPosts || []).map(post => {
      const prof = profileMap[post.author_id] || { name: "Membre", avatar: null };
      const postReactions = reactions?.filter(r => r.content_id === post.id) || [];
      return {
        id: post.id,
        author_id: post.author_id,
        author_name: prof.name,
        author_avatar: prof.avatar,
        content: post.content,
        type: post.type,
        created_at: post.created_at,
        amen_count: postReactions.filter(r => r.type === "amen").length,
        heart_count: postReactions.filter(r => r.type === "coeur").length,
        comment_count: 0,
        view_count: Math.floor(Math.random() * 30),
        my_amen: postReactions.some(r => r.author_id === user?.id && r.type === "amen"),
        image_url: post.image_url,
      };
    });

    setFlashes(enrichedFlashes);
    setPosts(enrichedPosts);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle Amen
  const handleAmen = async (postId: string, e: React.MouseEvent) => {
    if (!user) { navigate("/auth"); return; }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const pid = particleId.current++;
    setParticles(prev => [...prev, { id: pid, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);

    // Check in flashes
    const flash = flashes.find(f => f.id === postId);
    if (flash) {
      const wasAmen = flash.my_amen;
      setFlashes(prev => prev.map(f => f.id === postId ? {
        ...f, my_amen: !wasAmen, amen_count: f.amen_count + (wasAmen ? -1 : 1),
      } : f));
      if (selectedFlash?.id === postId) {
        setSelectedFlash(prev => prev ? { ...prev, my_amen: !wasAmen, amen_count: prev.amen_count + (wasAmen ? -1 : 1) } : null);
      }
      if (wasAmen) {
        await supabase.from("reactions").delete().eq("content_id", postId).eq("author_id", user.id).eq("type", "amen");
      } else {
        await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: "amen" });
      }
      return;
    }

    // Check in posts
    const post = posts.find(p => p.id === postId);
    if (post) {
      const wasAmen = post.my_amen;
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p, my_amen: !wasAmen, amen_count: p.amen_count + (wasAmen ? -1 : 1),
      } : p));
      if (wasAmen) {
        await supabase.from("reactions").delete().eq("content_id", postId).eq("author_id", user.id).eq("type", "amen");
      } else {
        await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: "amen" });
      }
    }
  };

  // New flash
  const handleNewFlash = async (data: { content: string; type: "text" | "verse" }) => {
    if (!user) return;
    await supabase.from("posts").insert({
      content: data.content,
      type: data.type === "verse" ? "verse" : "testimony",
      author_id: user.id,
    });
    fetchData();
  };

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #0a0a1a 0%, #1a1035 50%, #0f0a20 100%)",
    }}>
      {/* STYLES */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes amen-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* ETOILES */}
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} className="fixed rounded-full pointer-events-none"
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

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-4 py-3" style={{
        background: "rgba(10,10,26,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(186,85,211,0.2)",
      }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Menu className="w-5 h-5 text-white/60" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-bold text-white">MIREC</span>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-white/60" />
            <Bell className="w-5 h-5 text-white/60" />
          </div>
        </div>
      </header>

      {/* SECTION TEMOIGNAGES FLASH */}
      <div className="relative h-[320px] overflow-hidden">
        <h2 className="text-center text-white font-semibold text-lg mt-4 mb-2">Temoignages Flash</h2>
        
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center px-4">
            <p className="text-white/60 text-sm mb-3">Aucun temoignage pour le moment</p>
            <button onClick={() => user ? setShowNew(true) : navigate("/auth")}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold">
              Partager le premier
            </button>
          </div>
        ) : (
          <div className="relative h-[260px]">
            {flashes.slice(0, 5).map((flash, i) => (
              <FlashBubble
                key={flash.id}
                flash={flash}
                position={bubblePositions[i] || bubblePositions[0]}
                onOpen={setSelectedFlash}
                onAmen={handleAmen}
              />
            ))}
            
            {/* Central decorative element */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-purple-300/40 text-xs">Merci Seigneur pour<br/>cette journee benie !</p>
            </div>
          </div>
        )}
      </div>

      {/* FILTRES */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? "bg-white/15 text-white border border-purple-400/50"
                  : "bg-white/5 text-white/60 border border-white/10"
              }`}
            >
              {f.icon && <span>{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* POSTS FEED */}
      <div className="max-w-lg mx-auto px-4 space-y-4 pb-8">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onAmen={handleAmen} />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => user ? setShowNew(true) : navigate("/auth")}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-30"
        style={{
          background: "linear-gradient(135deg, #9333ea, #3b82f6)",
          boxShadow: "0 4px 20px rgba(147,51,234,0.5)",
        }}>
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* MODALS */}
      {showNew && <NewFlashModal onClose={() => setShowNew(false)} onSubmit={handleNewFlash} />}
      {selectedFlash && <FlashDetail flash={selectedFlash} onClose={() => setSelectedFlash(null)} onAmen={handleAmen} />}

      {/* PARTICULES */}
      {particles.map(p => (
        <AmenParticles key={p.id} x={p.x} y={p.y} onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))} />
      ))}
    </div>
  );
}
