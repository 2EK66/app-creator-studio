import { useState, useEffect, useCallback, useRef } from "react";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Plus, Bell, RefreshCw, MoreVertical, Pencil, Trash2, X, Check, Sparkles, Send, ImagePlus, Video } from "lucide-react";
import { FeedCommentSection } from "@/components/mirec/FeedCommentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

// ============================================================
// TYPES
// ============================================================
interface Flash {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  type: "text" | "verse" | "image" | "video";
  media_url: string | null;
  created_at: string;
  amen_count: number;
  my_amen: boolean;
}

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
  return h > 0 ? `${h}h` : `${m}min`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// ============================================================
// PARTICULES AMEN
// ============================================================
function AmenParticles({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, [onDone]);
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 2 * Math.PI;
    const dist = 30 + Math.random() * 25;
    return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, emoji: ["🙏","✨","⭐","💫","🌟"][i % 5] };
  });
  return (
    <div className="fixed pointer-events-none z-[200]" style={{ left: x, top: y }}>
      {particles.map((p, i) => (
        <div key={i} className="absolute text-sm" style={{ animation: "amen-particle 0.9s ease-out forwards", "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, animationDelay: `${i * 30}ms` } as any}>{p.emoji}</div>
      ))}
    </div>
  );
}

// ============================================================
// FLASH CARD — rectangle style Facebook Story
// ============================================================
function FlashCard({ flash, onOpen, onAmen }: {
  flash: Flash; onOpen: (f: Flash) => void; onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  const initials = (flash.author_name || "?").slice(0, 2).toUpperCase();

  const gradients: Record<string, string> = {
    text:  "linear-gradient(160deg, #1A4B9B, #7C3AED)",
    verse: "linear-gradient(160deg, #D97706, #f59e0b)",
    image: "linear-gradient(160deg, #059669, #0ea5e9)",
    video: "linear-gradient(160deg, #DC2626, #f97316)",
  };
  const gradient = gradients[flash.type] || gradients.text;

  return (
    <div
      className="flex-shrink-0 relative overflow-hidden cursor-pointer select-none"
      style={{
        width: 100, height: 160,
        borderRadius: 14,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        transition: "transform 0.15s ease",
      }}
      onClick={() => onOpen(flash)}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {flash.media_url && flash.type === "image" ? (
        <img src={flash.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : flash.media_url && flash.type === "video" ? (
        <video src={flash.media_url} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}

      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)" }} />

      <div className="absolute top-2 right-2">
        <span className="text-base">
          {flash.type === "text" ? "✨" : flash.type === "verse" ? "📖" : flash.type === "image" ? "🖼️" : "🎬"}
        </span>
      </div>

      <div className="absolute top-2 left-2">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/80"
          style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.3)" }}>
          {flash.author_avatar
            ? <img src={flash.author_avatar} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: gradient }}>{initials}</div>
          }
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
        <p className="text-[10px] font-bold text-white leading-tight truncate mb-0.5">
          {flash.author_name.split(" ")[0]}
        </p>
        {flash.type !== "image" && flash.type !== "video" && (
          <p className="text-[9px] text-white/75 line-clamp-2 leading-tight mb-1">
            {flash.content.slice(0, 50)}{flash.content.length > 50 ? "…" : ""}
          </p>
        )}
        <p className="text-[8px] text-white/50">{timeLeft(flash.created_at)}</p>

        <button
          onClick={e => { e.stopPropagation(); onAmen(flash.id, e); }}
          className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-full text-[9px] font-bold transition-all active:scale-90"
          style={{
            background: flash.my_amen ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)",
            color: flash.my_amen ? "#7C3AED" : "#fff",
            backdropFilter: "blur(4px)",
          }}
        >
          🙏 {flash.my_amen ? "Amen !" : "Amen"} {flash.amen_count > 0 && `(${flash.amen_count})`}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DÉTAIL FLASH
// ============================================================
function FlashDetail({ flash, onClose, onAmen }: {
  flash: Flash; onClose: () => void; onAmen: (id: string, e: React.MouseEvent) => void;
}) {
  const gradients: Record<string, string> = {
    text:  "linear-gradient(160deg, #1A4B9B, #7C3AED)",
    verse: "linear-gradient(160deg, #D97706, #f59e0b)",
    image: "linear-gradient(160deg, #059669, #0ea5e9)",
    video: "linear-gradient(160deg, #DC2626, #f97316)",
  };
  const gradient = gradients[flash.type] || gradients.text;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>

        {flash.media_url && flash.type === "image" && (
          <img src={flash.media_url} alt="" className="w-full max-h-72 object-cover" />
        )}
        {flash.media_url && flash.type === "video" && (
          <video src={flash.media_url} controls className="w-full max-h-72 bg-black" />
        )}

        <div style={{ background: gradient.replace("160deg", "180deg") }}>
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0">
              {flash.author_avatar
                ? <img src={flash.author_avatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-bold text-white">
                    {flash.author_name.slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{flash.author_name}</p>
              <p className="text-[10px] text-white/60">
                {flash.type === "text" ? "✨ Témoignage" : flash.type === "verse" ? "📖 Verset" : flash.type === "image" ? "🖼️ Photo" : "🎬 Vidéo"}
                · {timeLeft(flash.created_at)} restant
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/25 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {flash.content && (
            <div className="px-5 pb-4">
              <div className="bg-black/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <p className="text-sm text-white leading-relaxed">{flash.content}</p>
              </div>
            </div>
          )}

          <div className="px-5 pb-5 flex flex-col items-center gap-1.5">
            <button onClick={e => onAmen(flash.id, e)}
              className="flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95"
              style={{
                background: flash.my_amen ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)",
                color: flash.my_amen ? "#7C3AED" : "#fff",
                backdropFilter: "blur(8px)",
                boxShadow: flash.my_amen ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
              }}>
              🙏 {flash.my_amen ? "Amen !" : "Dire Amen"}
              {flash.amen_count > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">{flash.amen_count}</span>
              )}
            </button>
            <p className="text-[10px] text-white/50">
              {flash.amen_count} personne{flash.amen_count !== 1 ? "s" : ""} ont dit Amen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL NOUVEAU FLASH — avec image/vidéo
// ============================================================
function NewFlashModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { content: string; type: "text" | "verse" | "image" | "video"; mediaFile?: File }) => Promise<void>;
}) {
  const [type, setType]       = useState<"text" | "verse" | "image" | "video">("text");
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [preview, setPreview]  = useState<string | null>(null);
  const [saving, setSaving]    = useState(false);
  const [uploadProgress] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "video") {
      const vid = document.createElement("video");
      vid.src = URL.createObjectURL(file);
      vid.onloadedmetadata = () => {
        if (vid.duration > 180) {
          alert("La vidéo doit faire moins de 3 minutes !");
          return;
        }
        setMediaFile(file);
        setPreview(vid.src);
      };
      return;
    }

    if (file.size > 5 * 1024 * 1024) { alert("Image trop lourde (max 5 Mo)"); return; }
    setMediaFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    setSaving(true);
    await onSubmit({ content: content.trim(), type, mediaFile: mediaFile || undefined });
    setSaving(false);
    onClose();
  };

  const typeConfig = {
    text:  { label: "Témoignage",  emoji: "✨", ph: "Partage une victoire... (disparaît dans 24h)" },
    verse: { label: "Verset Flash", emoji: "📖", ph: "Un verset qui t'a touché aujourd'hui..." },
    image: { label: "Photo",        emoji: "🖼️", ph: "Décris ta photo (optionnel)..." },
    video: { label: "Vidéo (3min)", emoji: "🎬", ph: "Décris ta vidéo (optionnel)..." },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">✨ Nouveau Flash (24h)</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["text", "verse", "image", "video"] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setMediaFile(null); setPreview(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {typeConfig[t].emoji} {typeConfig[t].label}
            </button>
          ))}
        </div>

        {(type === "image" || type === "video") && (
          <div>
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden bg-black">
                {type === "image"
                  ? <img src={preview} alt="" className="w-full max-h-48 object-cover" />
                  : <video src={preview} controls className="w-full max-h-48" />
                }
                <button onClick={() => { setMediaFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => type === "image" ? imageRef.current?.click() : videoRef.current?.click()}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-2 hover:border-primary/40 transition-colors">
                {type === "image"
                  ? <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  : <Video className="w-8 h-8 text-muted-foreground" />
                }
                <p className="text-xs text-muted-foreground">
                  {type === "image" ? "Ajouter une photo (max 5 Mo)" : "Ajouter une vidéo (max 3 min)"}
                </p>
              </button>
            )}
            <input ref={imageRef} type="file" accept="image/*" onChange={handleMedia} className="hidden" />
            <input ref={videoRef} type="file" accept="video/*" onChange={handleMedia} className="hidden" />
          </div>
        )}

        <textarea
          value={content} onChange={e => setContent(e.target.value)} maxLength={280}
          placeholder={typeConfig[type].ph} rows={3}
          className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <p className="text-[10px] text-muted-foreground text-right">{content.length}/280</p>

        <div className="flex gap-2 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground">Annuler</button>
          <button onClick={handleSubmit}
            disabled={saving || (!content.trim() && !mediaFile)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{uploadProgress > 0 ? `${uploadProgress}%` : "Envoi..."}</>
              : <><Send className="w-4 h-4" /> Publier</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POST AVATAR
// ============================================================
function PostAvatar({ avatarUrl, initials, size = 40, onClick }: { avatarUrl: string | null; initials: string; size?: number; onClick?: () => void }) {
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return <button onClick={onClick} className="flex-shrink-0 rounded-full overflow-hidden hover:scale-105 transition-all" style={{ width: size, height: size, boxShadow: "0 0 0 2px var(--card), 0 0 0 3.5px rgba(26,75,155,0.2)" }}><img src={avatarUrl} alt={initials} onError={() => setImgError(true)} className="w-full h-full object-cover" /></button>;
  }
  return <button onClick={onClick} style={{ width: size, height: size, background: "linear-gradient(135deg, hsl(220 70% 35%), hsl(260 60% 50%))", boxShadow: "0 0 0 2px var(--card), 0 0 0 3.5px rgba(26,75,155,0.3)" }} className="rounded-full flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all"><span style={{ fontSize: size * 0.35 }} className="text-white font-bold">{initials}</span></button>;
}

function PhotoModal({ avatarUrl, name, initials, onClose }: { avatarUrl: string | null; name: string; initials: string; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
      <p className="text-white font-semibold text-base mb-4 opacity-90">{name}</p>
      <div className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl" style={{ width: 240, height: 240 }} onClick={e => e.stopPropagation()}>
        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 70% 35%), hsl(260 60% 50%))" }}><span className="text-white font-bold" style={{ fontSize: 72 }}>{initials}</span></div>}
      </div>
      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

function UserProfileModal({ userId, name, initials, avatarUrl, onClose, onViewPhoto, onTabChange }: { userId: string; name: string; initials: string; avatarUrl: string | null; onClose: () => void; onViewPhoto: () => void; onTabChange?: (tab: string, state?: Record<string, any>) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("full_name, username, points_total, streak_days, role, quartier, bio, cover_url").eq("id", userId).maybeSingle().then(({ data }) => { setProfile(data); setLoadingProfile(false); });
    supabase.from("posts").select("id").eq("author_id", userId).then(({ data }) => { setPostCount(data?.length || 0); });
    (supabase.from("member_skills" as any).select("skill, level").eq("profile_id", userId).limit(5) as any).then(({ data }: any) => { if (data) setSkills(data); });
  }, [userId]);
  const LEVELS = [{ name: "Nouveau croyant", min: 0, max: 200, icon: "🌱" }, { name: "Disciple", min: 200, max: 600, icon: "📖" }, { name: "Serviteur", min: 600, max: 1500, icon: "🙏" }, { name: "Évangéliste", min: 1500, max: 3000, icon: "📣" }, { name: "Ancien", min: 3000, max: 6000, icon: "⭐" }, { name: "Prophète", min: 6000, max: 99999, icon: "🏆" }];
  const pts = profile?.points_total || 0;
  const level = LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[0];
  const SKILL_COLORS: Record<string, string> = { debutant: "#6B7280", intermediaire: "#D97706", avance: "#059669", expert: "#1A4B9B", professionnel: "#7C3AED" };
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl overflow-y-auto" style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="relative">
          <div className="w-full h-28 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(26,75,155,0.4), rgba(124,58,237,0.3))" }}>{profile?.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />}</div>
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm"><X className="w-4 h-4 text-white" /></button>
          <div className="px-5 -mt-8 flex items-end justify-between pb-3 border-b border-border/30">
            <button onClick={onViewPhoto} className="rounded-full focus:outline-none hover:scale-105 transition-all flex-shrink-0" style={{ width: 64, height: 64 }}>
              {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" style={{ border: "3px solid var(--card)" }} /> : <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 70% 35%), hsl(260 60% 50%))", border: "3px solid var(--card)" }}><span className="text-white font-bold text-xl">{initials}</span></div>}
            </button>
            <div className="flex-1 min-w-0 ml-3 pt-8">
              <h3 className="font-bold text-base text-foreground truncate">{name}</h3>
              {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
              {profile?.role && profile.role !== "membre" && <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{profile.role === "pasteur" ? "⛪ Pasteur" : profile.role === "diacre" ? "🤝 Diacre" : profile.role === "admin" ? "🛡 Admin" : profile.role}</span>}
            </div>
          </div>
          {profile?.bio && <div className="px-5 py-2.5 border-b border-border/30"><p className="text-sm text-foreground/80">{profile.bio}</p></div>}
        </div>
        {loadingProfile ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : <>
          <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border/30">{[{ val: postCount, label: "Posts" }, { val: pts, label: "Points" }, { val: `${profile?.streak_days || 0}🔥`, label: "Streak" }].map((s, i) => <div key={i} className="text-center"><p className="font-bold text-lg text-foreground">{s.val}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>)}</div>
          <div className="px-5 py-3 border-b border-border/30"><div className="flex items-center gap-2"><span className="text-2xl">{level.icon}</span><div><p className="text-sm font-semibold text-foreground">{level.name}</p><p className="text-[10px] text-muted-foreground">{pts} points</p></div></div></div>
          {profile?.quartier && <div className="px-5 py-3 border-b border-border/30"><p className="text-xs text-muted-foreground">📍 {profile.quartier}</p></div>}
          {skills.length > 0 && <div className="px-5 py-3 border-b border-border/30"><p className="text-xs font-semibold text-muted-foreground mb-2">💼 Compétences</p><div className="flex flex-wrap gap-2">{skills.map((s: any, i: number) => <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: SKILL_COLORS[s.level] || "#6B7280", backgroundColor: (SKILL_COLORS[s.level] || "#6B7280") + "18" }}>{s.skill}</span>)}</div></div>}
        </>}
        <div className="px-5 py-4"><button onClick={() => { onClose(); onTabChange?.("inbox", { openConversationWith: userId, userName: name, avatarUrl }); }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">💬 Envoyer un message</button></div>
      </div>
    </div>
  );
}

// ============================================================
// TYPE CONFIG POSTS
// ============================================================
function typeConfig(type: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; gradient: string }> = {
    prayer:       { label: "🙏 Prière",      color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", gradient: "linear-gradient(135deg, #7C3AED18 0%, #a855f710 100%)" },
    testimony:    { label: "✨ Témoignage",   color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", gradient: "linear-gradient(135deg, #05966918 0%, #10b98110 100%)" },
    announcement: { label: "📢 Annonce",      color: "#1A4B9B", bg: "#EEF5FD", border: "#BFDBFE", gradient: "linear-gradient(135deg, #1A4B9B18 0%, #3b82f610 100%)" },
    verse:        { label: "📖 Verset",       color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", gradient: "linear-gradient(135deg, #D9770618 0%, #f59e0b10 100%)" },
  };
  return map[type] || { label: "💬 Post", color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", gradient: "linear-gradient(135deg, #6B728010 0%, #9ca3af08 100%)" };
}

// ============================================================
// FEED PRINCIPAL
// ============================================================
export default function Feed({ onTabChange }: FeedProps) {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  // Flash States
  const [flashes, setFlashes]         = useState<Flash[]>([]);
  const [, setLoadingFlashes] = useState(true);
  const [selectedFlash, setSelectedFlash]   = useState<Flash | null>(null);
  const [showNewFlash, setShowNewFlash]     = useState(false);
  const [particles, setParticles]     = useState<{ id: number; x: number; y: number }[]>([]);
  const particleId = useRef(0);

  // Posts States
  const [posts, setPosts]           = useState<FeedPost[]>([]);
  const [, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [filter, setFilter]         = useState("all");
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [photoModal, setPhotoModal]   = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [profileModal, setProfileModal] = useState<{ userId: string; name: string; initials: string; avatar: string | null } | null>(null);

  // ---- FETCH FLASHES ----
  const fetchFlashes = useCallback(async () => {
    setLoadingFlashes(true);
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: fd, error } = await supabase
        .from("flashes").select("id, content, type, media_url, created_at, author_id")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      if (!fd || fd.length === 0) { setFlashes([]); setLoadingFlashes(false); return; }
      const ids = [...new Set(fd.map((f: any) => f.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const pm = Object.fromEntries((profiles || []).map(p => [p.id, { name: p.full_name || "Membre", avatar: getAvatarUrl(p.avatar_url) }]));
      const fids = fd.map((f: any) => f.id);
      const { data: amens } = await supabase.from("flash_amens").select("flash_id, user_id").in("flash_id", fids);
      setFlashes(fd.map((flash: any) => {
        const prof = pm[flash.author_id] || { name: "Membre", avatar: null };
        const al = amens?.filter((a: any) => a.flash_id === flash.id) || [];
        return { id: flash.id, author_id: flash.author_id, author_name: prof.name, author_avatar: prof.avatar, content: flash.content || "", type: flash.type as Flash["type"], media_url: flash.media_url || null, created_at: flash.created_at, amen_count: al.length, my_amen: al.some((a: any) => a.user_id === user?.id) };
      }));
    } catch (err) { console.error(err); } finally { setLoadingFlashes(false); }
  }, [user]);

  const handleAmen = async (flashId: string, e: React.MouseEvent) => {
    if (!user) { navigate("/auth"); return; }
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const pid = particleId.current++;
    setParticles(prev => [...prev, { id: pid, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);
    const flash = flashes.find(f => f.id === flashId);
    if (!flash) return;
    const wasAmen = flash.my_amen;
    setFlashes(prev => prev.map(f => f.id === flashId ? { ...f, my_amen: !wasAmen, amen_count: f.amen_count + (wasAmen ? -1 : 1) } : f));
    if (selectedFlash?.id === flashId) setSelectedFlash(prev => prev ? { ...prev, my_amen: !wasAmen, amen_count: prev.amen_count + (wasAmen ? -1 : 1) } : null);
    if (wasAmen) await supabase.from("flash_amens").delete().eq("flash_id", flashId).eq("user_id", user.id);
    else await supabase.from("flash_amens").insert({ flash_id: flashId, user_id: user.id });
  };

  // ---- FETCH POSTS ----
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingPosts(true);
    try {
      let q = supabase.from("posts").select("id, created_at, content, type, author_id, image_url").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("type", filter);
      const { data: pd, error } = await q;
      if (error) throw error;
      if (!pd || pd.length === 0) { setPosts([]); return; }
      
      const authorIds = [...new Set(pd.map(p => p.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
      const pm = Object.fromEntries((profiles || []).map(p => [p.id, { name: p.full_name || "Membre", avatar: getAvatarUrl(p.avatar_url) }]));
      
      const postIds = pd.map(p => p.id);
      const { data: rx } = await supabase.from("post_reactions").select("post_id, reaction_type, user_id").in("post_id", postIds);
      const { data: cc } = await supabase.rpc("get_comments_count", { post_ids: postIds });
      const cm = Object.fromEntries((cc || []).map((c: any) => [c.post_id, c.count]));

      setPosts(pd.map((p: any) => {
        const prof = pm[p.author_id] || { name: "Membre", avatar: null };
        const pr = rx?.filter(r => r.post_id === p.id) || [];
        const ur = Object.fromEntries(pr.filter(r => r.user_id === user?.id).map(r => [r.reaction_type, true]));
        return {
          id: p.id, created_at: p.created_at, content: p.content, type: p.type, author_id: p.author_id,
          author_name: prof.name, author_initials: prof.name.slice(0, 2).toUpperCase(), author_avatar: prof.avatar,
          image_url: p.image_url ? supabase.storage.from("posts").getPublicUrl(p.image_url).data?.publicUrl : null,
          reactions: { amen: pr.filter(r => r.reaction_type === "amen").length, feu: pr.filter(r => r.reaction_type === "feu").length, coeur: pr.filter(r => r.reaction_type === "coeur").length },
          user_reactions: ur, comments_count: cm[p.id] || 0
        };
      }));
    } catch (err) { console.error(err); } finally { setLoadingPosts(false); setRefreshing(false); }
  }, [filter, user]);

  useEffect(() => { fetchFlashes(); fetchPosts(); }, [fetchFlashes, fetchPosts]);

  const handleNewFlashSubmit = async (data: { content: string; type: Flash["type"]; mediaFile?: File }) => {
    if (!user) return;
    try {
      let media_url = null;
      if (data.mediaFile) {
        const ext = data.mediaFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("flashes" as any).upload(path, data.mediaFile);
        if (upErr) throw upErr;
        media_url = supabase.storage.from("flashes" as any).getPublicUrl(path).data?.publicUrl || null;
      }
      const { error } = await supabase.from("flashes").insert({ author_id: user.id, content: data.content, type: data.type, media_url });
      if (error) throw error;
      fetchFlashes();
    } catch (err) { console.error(err); alert("Erreur de publication du Flash"); }
  };

  const handlePostReact = async (postId: string, typeStr: "amen" | "feu" | "coeur") => {
    if (!user) { navigate("/auth"); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasReacted = post.user_reactions[typeStr];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, user_reactions: { ...p.user_reactions, [typeStr]: !wasReacted }, reactions: { ...p.reactions, [typeStr]: p.reactions[typeStr] + (wasReacted ? -1 : 1) } };
    }));
    if (wasReacted) await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("reaction_type", typeStr);
    else await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction_type: typeStr });
  };

  const handlePostDelete = async (postId: string) => {
    if (!window.confirm("Supprimer ce post ?")) return;
    setMenuOpen(null);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handlePostEditSave = async (postId: string) => {
    if (!editContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editContent.trim() }).eq("id", postId);
    if (!error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
      setEditingPost(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between z-40">
        <MirecLogo className="h-7 w-auto" />
        <div className="flex items-center gap-2">
          <button onClick={() => fetchPosts(true)} className="p-2 rounded-full hover:bg-muted text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button className="p-2 rounded-full hover:bg-muted text-foreground relative">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Flashes / Stories bar */}
      <div className="border-b border-border/30 bg-card/40 py-4 px-4 overflow-x-auto flex gap-3 scrollbar-none items-center">
        <button onClick={() => { if (!user) navigate("/auth"); else setShowNewFlash(true); }}
          className="flex-shrink-0 flex flex-col items-center justify-center bg-muted rounded-2xl relative hover:bg-muted/80 transition-all border border-dashed border-border"
          style={{ width: 100, height: 160, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1"><Plus className="w-5 h-5" /></div>
          <span className="text-[11px] font-bold text-foreground">Mon Flash</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">24h éphémère</span>
        </button>

        {flashes.map(f => (
          <FlashCard key={f.id} flash={f} onOpen={setSelectedFlash} onAmen={handleAmen} />
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-4 flex gap-1.5 overflow-x-auto scrollbar-none border-b border-border/20 bg-background sticky top-[53px] z-30 py-2">
        {[{ id: "all", l: "Tout" }, { id: "testimony", l: "✨ Témoignages" }, { id: "prayer", l: "🙏 Prières" }, { id: "announcement", l: "📢 Annonces" }, { id: "verse", l: "📖 Versets" }].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === t.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border/50 hover:bg-muted"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Main Feed Posts List */}
      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        {posts.map(post => {
          const tc = typeConfig(post.type);
          const isMe = user?.id === post.author_id;
          return (
            <div key={post.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border/40 space-y-3 relative">
              <div className="flex items-start gap-3">
                <PostAvatar avatarUrl={post.author_avatar} initials={post.author_initials}
                  onClick={() => setProfileModal({ userId: post.author_id, name: post.author_name, initials: post.author_initials, avatar: post.author_avatar })}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{post.author_name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{timeAgo(post.created_at)}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: tc.bg, color: tc.color }}>{tc.label}</span>
                  </div>
                </div>

                {isMe && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} className="p-1 rounded-full hover:bg-muted text-muted-foreground"><MoreVertical className="w-4 h-4" /></button>
                    {menuOpen === post.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg py-1 z-10 animate-in fade-in slide-in-from-top-1">
                        <button onClick={() => { setEditingPost(post.id); setEditContent(post.content); setMenuOpen(null); }} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted text-foreground font-medium"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Modifier</button>
                        <button onClick={() => handlePostDelete(post.id)} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted text-destructive font-medium border-t border-border/40"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingPost === post.id ? (
                <div className="space-y-2 mt-2">
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full text-sm p-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={3} />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setEditingPost(null)} className="p-1.5 rounded-lg border border-border text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handlePostEditSave(post.id)} className="p-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1 text-xs font-bold"><Check className="w-3.5 h-3.5" /> Sauver</button>
                  </div>
                </div>
              ) : (
                <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${post.type === "verse" ? "font-serif italic text-base bg-muted/30 p-3 rounded-xl border-l-4 border-amber-500" : ""}`}>{post.content}</p>
              )}

              {post.image_url && (
                <div onClick={() => setPhotoModal({ url: post.image_url, name: post.author_name, initials: post.author_initials })}
                  className="rounded-xl overflow-hidden bg-muted border border-border/30 max-h-60 cursor-pointer overflow-hidden group">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                </div>
              )}

              {/* Reactions buttons */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/20">
                {(["amen", "feu", "coeur"] as const).map(rk => {
                  const emojis = { amen: "🙏", feu: "🔥", coeur: "❤️" };
                  const active = post.user_reactions[rk];
                  return (
                    <button key={rk} onClick={() => handlePostReact(post.id, rk)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95 ${active ? "bg-primary/5 border-primary/20 font-bold text-primary" : "bg-muted/40 border-transparent text-muted-foreground"}`}>
                      <span>{emojis[rk]}</span>
                      {post.reactions[rk] > 0 && <span className="text-[11px] font-medium">{post.reactions[rk]}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Comments Section expanded by default for full interactions */}
              <FeedCommentSection postId={post.id} initialCount={post.comments_count} />
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB) for new Post */}
      <button onClick={() => { if (!user) navigate("/auth"); else setShowNewPost(true); }}
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40">
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Modals Mounting */}
      {showNewPost && <NewPostModal onClose={() => setShowNewPost(false)} onPostCreated={() => fetchPosts()} />}
      {showNewFlash && <NewFlashModal onClose={() => setShowNewFlash(false)} onSubmit={handleNewFlashSubmit} />}
      {selectedFlash && <FlashDetail flash={selectedFlash} onClose={() => setSelectedFlash(null)} onAmen={handleAmen} />}
      {photoModal && <PhotoModal avatarUrl={photoModal.url} name={photoModal.name} initials={photoModal.initials} onClose={() => setPhotoModal(null)} />}
      
      {profileModal && (
        <UserProfileModal userId={profileModal.userId} name={profileModal.name} initials={profileModal.initials} avatarUrl={profileModal.avatar}
          onClose={() => setProfileModal(null)} onTabChange={onTabChange}
          onViewPhoto={() => { const av = profileModal.avatar; const nm = profileModal.name; const ini = profileModal.initials; setProfileModal(null); setPhotoModal({ url: av, name: nm, initials: ini }); }}
        />
      )}

      {/* Particles Canvas Container */}
      {particles.map(p => (
        <AmenParticles key={p.id} x={p.x} y={p.y} onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))} />
      ))}
    </div>
  );
}
