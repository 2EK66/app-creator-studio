import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Plus, X, Mic, Square, Send, Music, BookOpen, Radio } from "lucide-react";

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

// ============================================================
// UTILITAIRES
// ============================================================
function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
}

function timeLeft(iso: string): string {
  const diff = 24 * 3600 * 1000 - (Date.now() - new Date(iso).getTime());
  if (diff <= 0) return "Expiré";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h restantes` : `${m}min`;
}

// ============================================================
// PARTICULES AMEN — explosion de petites étoiles
// ============================================================
function AmenParticles({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = Array.from({ length: 10 }, (_, i) => {
    const angle  = (i / 10) * 2 * Math.PI;
    const dist   = 40 + Math.random() * 30;
    const tx     = Math.cos(angle) * dist;
    const ty     = Math.sin(angle) * dist;
    const emojis = ["🙏", "✨", "⭐", "💫", "🌟"];
    return { tx, ty, emoji: emojis[i % emojis.length] };
  });

  return (
    <div className="fixed pointer-events-none z-[200]" style={{ left: x, top: y }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute text-sm"
          style={{
            animation: `amen-particle 0.9s ease-out forwards`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animationDelay: `${i * 30}ms`,
          } as any}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// BULLE FLASH — organique, flottante, avec aura
// ============================================================
function FlashBubble({
  flash,
  size = "md",
  delay = 0,
  onOpen,
  onAmen,
}: {
  flash: Flash;
  size?: "sm" | "md" | "lg";
  delay?: number;
  onOpen: (f: Flash) => void;
  onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dim = size === "lg" ? 120 : size === "md" ? 96 : 76;
  const avatarDim = size === "lg" ? 56 : size === "md" ? 44 : 34;
  const initials = flash.author_name.slice(0, 2).toUpperCase();

  const typeColors: Record<string, { from: string; to: string; glow: string }> = {
    text:  { from: "#1A4B9B", to: "#7C3AED", glow: "rgba(124,58,237,0.5)" },
    audio: { from: "#059669", to: "#0ea5e9", glow: "rgba(14,165,233,0.5)" },
    verse: { from: "#D97706", to: "#f59e0b", glow: "rgba(245,158,11,0.5)" },
  };
  const colors = typeColors[flash.type] || typeColors.text;

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 cursor-pointer select-none"
      style={{
        width: dim,
        animation: `float ${3 + delay}s ease-in-out infinite`,
        animationDelay: `${delay * 0.4}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(flash)}
    >
      {/* AURA lumineuse si non lu */}
      {!flash.is_read && (
        <div
          className="absolute rounded-full transition-all duration-300"
          style={{
            width: dim + 16,
            height: dim + 16,
            top: -8,
            left: -8,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: "aura-pulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* BULLE principale — forme organique via border-radius */}
      <div
        className="relative overflow-hidden transition-transform duration-300"
        style={{
          width: dim,
          height: dim,
          borderRadius: hovered
            ? "40% 60% 55% 45% / 50% 45% 55% 50%"
            : "45% 55% 60% 40% / 55% 40% 60% 45%",
          background: flash.is_read
            ? "var(--card)"
            : `linear-gradient(135deg, ${colors.from}22, ${colors.to}33)`,
          border: flash.is_read
            ? "1.5px solid var(--border)"
            : `2px solid ${colors.from}88`,
          boxShadow: hovered
            ? `0 8px 24px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.2)`
            : flash.is_read ? "0 2px 8px rgba(0,0,0,0.1)" : `0 4px 16px ${colors.glow}`,
          transform: hovered ? "scale(1.08)" : "scale(1)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Avatar */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <div
            className="rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{
              width: avatarDim, height: avatarDim,
              borderColor: flash.is_read ? "var(--border)" : colors.from,
            }}
          >
            {flash.author_avatar ? (
              <img src={flash.author_avatar} alt={initials} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                <span className="text-white font-bold" style={{ fontSize: avatarDim * 0.33 }}>{initials}</span>
              </div>
            )}
          </div>

          <p className="text-[9px] font-semibold text-center truncate w-full px-1"
            style={{ color: flash.is_read ? "var(--foreground)" : colors.from, lineHeight: 1.2 }}>
            {flash.author_name.split(" ")[0]}
          </p>

          {/* Type badge */}
          <span className="text-[8px]">
            {flash.type === "audio" ? "🎤" : flash.type === "verse" ? "📖" : "✨"}
          </span>
        </div>
      </div>

      {/* Aperçu texte */}
      <p className="text-[9px] text-muted-foreground text-center line-clamp-2 leading-tight px-1 w-full">
        {flash.type === "audio" ? "Témoignage vocal" : flash.content.slice(0, 40) + (flash.content.length > 40 ? "…" : "")}
      </p>

      {/* Bouton AMEN */}
      <button
        onClick={(e) => { e.stopPropagation(); onAmen(flash.id, e); }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all duration-200 active:scale-90"
        style={{
          background: flash.my_amen
            ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
            : "var(--muted)",
          color: flash.my_amen ? "#fff" : "var(--muted-foreground)",
          border: flash.my_amen ? "none" : "1px solid var(--border)",
          boxShadow: flash.my_amen ? `0 2px 8px ${colors.glow}` : "none",
        }}
      >
        🙏 Amen {flash.amen_count > 0 && `(${flash.amen_count})`}
      </button>

      {/* Temps restant */}
      <p className="text-[8px] text-muted-foreground/60">{timeLeft(flash.created_at)}</p>
    </div>
  );
}

// ============================================================
// MODAL DÉTAIL DU FLASH
// ============================================================
function FlashDetail({ flash, onClose, onAmen }: {
  flash: Flash; onClose: () => void; onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  const typeColors: Record<string, { from: string; to: string }> = {
    text:  { from: "#1A4B9B", to: "#7C3AED" },
    audio: { from: "#059669", to: "#0ea5e9" },
    verse: { from: "#D97706", to: "#f59e0b" },
  };
  const colors = typeColors[flash.type] || typeColors.text;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(160deg, ${colors.from}22, ${colors.to}33, var(--card))`,
          border: `1.5px solid ${colors.from}44`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fermer */}
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10">
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: colors.from }}>
            {flash.author_avatar
              ? <img src={flash.author_avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                  <span className="text-white font-bold">{flash.author_name.slice(0, 2).toUpperCase()}</span>
                </div>
            }
          </div>
          <div>
            <p className="font-bold text-sm text-white">{flash.author_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/60">
                {flash.type === "text" ? "✨ Témoignage" : flash.type === "audio" ? "🎤 Vocal" : "📖 Verset"}
              </span>
              <span className="text-[10px] text-white/40">· {timeLeft(flash.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-5 pb-4">
          {flash.type === "audio" ? (
            <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Témoignage vocal</p>
                <p className="text-[11px] text-white/50">Appuie pour écouter</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/8 rounded-2xl p-4">
              <p className="text-sm text-white leading-relaxed">{flash.content}</p>
            </div>
          )}
        </div>

        {/* Bouton AMEN centré */}
        <div className="px-5 pb-5 flex flex-col items-center gap-2">
          <button
            onClick={(e) => onAmen(flash.id, e)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: flash.my_amen
                ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
                : "rgba(255,255,255,0.12)",
              color: "#fff",
              border: flash.my_amen ? "none" : "1.5px solid rgba(255,255,255,0.2)",
              boxShadow: flash.my_amen ? `0 4px 16px ${colors.from}88` : "none",
            }}
          >
            🙏 {flash.my_amen ? "Amen !" : "Dire Amen"}
            {flash.amen_count > 0 && (
              <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px]">{flash.amen_count}</span>
            )}
          </button>
          <p className="text-[10px] text-white/40">
            {flash.amen_count} personne{flash.amen_count !== 1 ? "s" : ""} ont dit Amen
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL NOUVEAU FLASH
// ============================================================
function NewFlashModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { content: string; type: "text" | "verse" }) => Promise<void>;
}) {
  const [type, setType]       = useState<"text" | "verse">("text");
  const [content, setContent] = useState("");
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await onSubmit({ content: content.trim(), type });
    setSaving(false);
    onClose();
  };

  const typeConfig = {
    text:  { label: "Témoignage",  emoji: "✨", placeholder: "Partage une victoire, un merci à Dieu, une grâce reçue... (max 24h)", color: "#7C3AED" },
    verse: { label: "Verset Flash", emoji: "📖", placeholder: "Un verset qui t'a touché aujourd'hui...", color: "#D97706" },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">✨ Nouveau Flash (24h)</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Type */}
        <div className="flex gap-2">
          {(Object.keys(typeConfig) as Array<"text" | "verse">).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {typeConfig[t].emoji} {typeConfig[t].label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={280}
          placeholder={typeConfig[type].placeholder}
          rows={4}
          className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <p className="text-[10px] text-muted-foreground text-right">{content.length}/280</p>

        <div className="flex gap-2 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground">Annuler</button>
          <button onClick={handleSubmit} disabled={saving || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Publier</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE LOUNGE PRINCIPALE
// ============================================================
export default function Louange() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [flashes, setFlashes]       = useState<Flash[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [selectedFlash, setSelectedFlash] = useState<Flash | null>(null);
  const [particles, setParticles]   = useState<{ id: number; x: number; y: number }[]>([]);
  const particleId = useRef(0);

  // ---- Charger les flashes (posts type flash/testimony/verse des 24h) ----
  const fetchFlashes = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, type, created_at, author_id")
      .in("type", ["testimony", "verse", "flash"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!posts) { setLoading(false); return; }

    // Profils
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, { name: p.full_name || "Membre", avatar: getAvatarUrl(p.avatar_url) }])
    );

    // Réactions "amen"
    const postIds = posts.map(p => p.id);
    const { data: reactions } = await supabase
      .from("reactions").select("content_id, author_id, type")
      .in("content_id", postIds).eq("type", "amen");

    const enriched: Flash[] = posts.map(post => {
      const prof  = profileMap[post.author_id] || { name: "Membre", avatar: null };
      const amens = reactions?.filter(r => r.content_id === post.id) || [];
      return {
        id:           post.id,
        author_id:    post.author_id,
        author_name:  prof.name,
        author_avatar: prof.avatar,
        content:      post.content,
        type:         (post.type === "verse" ? "verse" : "text") as "text" | "audio" | "verse",
        created_at:   post.created_at,
        amen_count:   amens.length,
        my_amen:      amens.some(r => r.author_id === user?.id),
        is_read:      false,
      };
    });

    setFlashes(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFlashes(); }, [fetchFlashes]);

  // ---- Amen ----
  const handleAmen = async (postId: string, e: React.MouseEvent) => {
    if (!user) { navigate("/auth"); return; }

    // Particules
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const pid  = particleId.current++;
    setParticles(prev => [...prev, { id: pid, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);

    const flash    = flashes.find(f => f.id === postId);
    if (!flash) return;
    const wasAmen  = flash.my_amen;

    // Optimistic update
    setFlashes(prev => prev.map(f => f.id === postId ? {
      ...f,
      my_amen:    !wasAmen,
      amen_count: f.amen_count + (wasAmen ? -1 : 1),
    } : f));

    if (selectedFlash?.id === postId) {
      setSelectedFlash(prev => prev ? { ...prev, my_amen: !wasAmen, amen_count: prev.amen_count + (wasAmen ? -1 : 1) } : null);
    }

    if (wasAmen) {
      await supabase.from("reactions").delete()
        .eq("content_id", postId).eq("author_id", user.id).eq("type", "amen");
    } else {
      await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: "amen" });
    }
  };

  // ---- Nouveau flash ----
  const handleNewFlash = async (data: { content: string; type: "text" | "verse" }) => {
    if (!user) return;
    await supabase.from("posts").insert({
      content:   data.content,
      type:      data.type === "verse" ? "verse" : "testimony",
      author_id: user.id,
    });
    fetchFlashes();
  };

  // ---- Tailles variables pour les bulles (effet organique) ----
  const sizes: Array<"sm" | "md" | "lg"> = ["md", "lg", "md", "sm", "md", "lg", "sm", "md"];

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--background)" }}>

      {/* STYLES ANIMATIONS */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%  { transform: translateY(-8px) rotate(0.5deg); }
          66%  { transform: translateY(-4px) rotate(-0.5deg); }
        }
        @keyframes aura-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%  { opacity: 0.8; transform: scale(1.08); }
        }
        @keyframes amen-particle {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes bg-shift {
          0%, 100% { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
      `}</style>

      {/* FOND DÉGRADÉ ANIMÉ */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 20%, rgba(26,75,155,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(217,119,6,0.06) 0%, transparent 60%), var(--background)",
        animation: "bg-shift 12s ease-in-out infinite",
      }} />

      {/* ÉTOILES DE FOND */}
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i} className="fixed rounded-full pointer-events-none -z-10"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top:  `${Math.random() * 100}%`,
            background: "#fff",
            animation: `shimmer ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: 0.3,
          }}
        />
      ))}

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-4 py-3" style={{
        background: "rgba(var(--card-rgb, 255,255,255), 0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(var(--border-rgb, 0,0,0), 0.1)",
      }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-500" />
            <div>
              <h1 className="font-bold text-lg text-foreground leading-none">Lounge MIREC</h1>
              <p className="text-[10px] text-muted-foreground">Témoignages Flash · 24h</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {flashes.length} actifs
          </div>
        </div>
      </header>

      {/* ZONE BULLES FLOTTANTES */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-foreground">✨ Témoignages Flash</span>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flashes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #1A4B9B22, #7C3AED22)", border: "2px dashed #7C3AED44" }}>
              <span className="text-3xl">🙏</span>
            </div>
            <p className="font-bold text-foreground mb-1">Aucun témoignage aujourd'hui</p>
            <p className="text-sm text-muted-foreground mb-4">Sois le premier à partager une victoire !</p>
            <button onClick={() => { if (!user) navigate("/auth"); else setShowNew(true); }}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Partager maintenant
            </button>
          </div>
        ) : (
          /* GRILLE DE BULLES — disposition organique */
          <div className="relative">
            {/* Ligne 1 — bulles principales */}
            <div className="flex items-end justify-around gap-2 mb-4">
              {flashes.slice(0, Math.min(4, flashes.length)).map((flash, i) => (
                <FlashBubble
                  key={flash.id}
                  flash={flash}
                  size={sizes[i % sizes.length]}
                  delay={i}
                  onOpen={setSelectedFlash}
                  onAmen={handleAmen}
                />
              ))}
            </div>

            {/* Ligne 2 — si plus de 4 flashes */}
            {flashes.length > 4 && (
              <div className="flex items-end justify-around gap-2 mb-4">
                {flashes.slice(4, Math.min(8, flashes.length)).map((flash, i) => (
                  <FlashBubble
                    key={flash.id}
                    flash={flash}
                    size={sizes[(i + 4) % sizes.length]}
                    delay={i + 4}
                    onOpen={setSelectedFlash}
                    onAmen={handleAmen}
                  />
                ))}
              </div>
            )}

            {/* Ligne 3 */}
            {flashes.length > 8 && (
              <div className="flex items-end justify-around gap-2">
                {flashes.slice(8, 12).map((flash, i) => (
                  <FlashBubble
                    key={flash.id}
                    flash={flash}
                    size={sizes[(i + 8) % sizes.length]}
                    delay={i + 8}
                    onOpen={setSelectedFlash}
                    onAmen={handleAmen}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION LOUANGE */}
      <div className="max-w-lg mx-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-3 mt-4">
          <span className="text-sm font-bold text-foreground">🎶 Espace Louange</span>
          <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Music, label: "Cantiques MIREC", sub: "Répertoire musical", color: "#7C3AED", bg: "#7C3AED" },
            { icon: BookOpen, label: "Verset du jour", sub: "Méditation quotidienne", color: "#D97706", bg: "#D97706" },
            { icon: Mic, label: "Prière guidée", sub: "Session de prière", color: "#059669", bg: "#059669" },
            { icon: Radio, label: "Radio MIREC", sub: "Lounge en direct", color: "#1A4B9B", bg: "#1A4B9B" },
          ].map((item, i) => (
            <button key={i}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.bg}18` }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAB — nouveau flash */}
      <button
        onClick={() => { if (!user) { navigate("/auth"); return; } setShowNew(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
        style={{ background: "linear-gradient(135deg, #1A4B9B, #7C3AED)", boxShadow: "0 4px 20px rgba(124,58,237,0.5)" }}>
        <Plus className="w-6 h-6" />
      </button>

      {/* MODALS */}
      {showNew && <NewFlashModal onClose={() => setShowNew(false)} onSubmit={handleNewFlash} />}
      {selectedFlash && <FlashDetail flash={selectedFlash} onClose={() => setSelectedFlash(null)} onAmen={handleAmen} />}

      {/* PARTICULES AMEN */}
      {particles.map(p => (
        <AmenParticles
          key={p.id}
          x={p.x}
          y={p.y}
          onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}
    </div>
  );
}
