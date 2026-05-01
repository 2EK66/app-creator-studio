import { useState, useEffect, useCallback, useRef } from "react";
import { NewPostModal } from "@/components/mirec/NewPostModal";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Plus, Bell, RefreshCw, MoreVertical, Pencil, Trash2, X, Check, Sparkles, Send, ImagePlus, Video } from "lucide-react";
import { FeedCommentSection } from "@/components/mirec/FeedCommentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Podcast from "@/pages/Podcast";

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

  // Dégradé selon le type
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
      {/* Fond — image/vidéo ou dégradé */}
      {flash.media_url && flash.type === "image" ? (
        <img src={flash.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : flash.media_url && flash.type === "video" ? (
        <video src={flash.media_url} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}

      {/* Overlay sombre en bas */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)" }} />

      {/* Badge type */}
      <div className="absolute top-2 right-2">
        <span className="text-base">
          {flash.type === "text" ? "✨" : flash.type === "verse" ? "📖" : flash.type === "image" ? "🖼️" : "🎬"}
        </span>
      </div>

      {/* Avatar en haut à gauche */}
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

      {/* Infos bas */}
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

        {/* Bouton Amen */}
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

        {/* Media plein si image/vidéo */}
        {flash.media_url && flash.type === "image" && (
          <img src={flash.media_url} alt="" className="w-full max-h-72 object-cover" />
        )}
        {flash.media_url && flash.type === "video" && (
          <video src={flash.media_url} controls className="w-full max-h-72 bg-black" />
        )}

        {/* Corps */}
        <div style={{ background: gradient.replace("160deg", "180deg") }}>
          {/* Header auteur */}
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

          {/* Texte */}
          {flash.content && (
            <div className="px-5 pb-4">
              <div className="bg-black/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <p className="text-sm text-white leading-relaxed">{flash.content}</p>
              </div>
            </div>
          )}

          {/* Bouton Amen */}
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation vidéo < 3 min (180s) — vérif côté client via durée
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

    // Image — max 5 Mo
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

        {/* Sélecteur de type */}
        <div className="flex gap-2 flex-wrap">
          {(["text", "verse", "image", "video"] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setMediaFile(null); setPreview(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {typeConfig[t].emoji} {typeConfig[t].label}
            </button>
          ))}
        </div>

        {/* Zone média */}
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

        {/* Texte */}
        <textarea
          value={content} onChange={e => setContent(e.target.value)} maxLength={280}
          placeholder={typeConfig[type].ph} rows={3}
          className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <p className="text-[10px] text-muted-foreground text-right">{content.length}/280</p>

        {/* Actions */}
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

  // Flash
  const [flashes, setFlashes]         = useState<Flash[]>([]);
  const [loadingFlashes, setLoadingFlashes] = useState(true);
  const [selectedFlash, setSelectedFlash]   = useState<Flash | null>(null);
  const [showNewFlash, setShowNewFlash]     = useState(false);
  const [particles, setParticles]     = useState<{ id: number; x: number; y: number }[]>([]);
  const particleId = useRef(0);

  // Posts
  const [posts, setPosts]           = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
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

  // ---- NOUVEAU FLASH avec upload media ----
  const handleNewFlash = async (data: { content: string; type: Flash["type"]; mediaFile?: File }) => {
    if (!user) return;
    let mediaUrl: string | null = null;

    if (data.mediaFile) {
      const ext  = data.mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const bucket = data.type === "video" ? "flash-videos" : "flash-images";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, data.mediaFile);
      if (upErr) { console.error("Upload:", upErr); return; }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    await supabase.from("flashes").insert({ content: data.content, type: data.type, media_url: mediaUrl, author_id: user.id });
    fetchFlashes();
  };

  // ---- FETCH POSTS ----
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoadingPosts(true);
    let result = await supabase.from("posts").select("id, content, type, created_at, author_id, image_url").order("created_at", { ascending: false }).limit(50);
    if (result.error) result = await supabase.from("posts").select("id, content, type, created_at, author_id").order("created_at", { ascending: false }).limit(50);
    const { data: postsData, error } = result;
    if (error || !postsData) { setLoadingPosts(false); setRefreshing(false); return; }
    const authorIds = [...new Set(postsData.map(p => p.author_id).filter(Boolean))];
    let profileMap: Record<string, { name: string; avatar: string | null }> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, { name: p.full_name || "Membre MIREC", avatar: getAvatarUrl(p.avatar_url) }]));
    }
    const postIds = postsData.map(p => p.id);
    const { data: allReactions } = await supabase.from("reactions").select("content_id, type, author_id").in("content_id", postIds);
    const { data: allComments }  = await supabase.from("comments").select("post_id").in("post_id", postIds);
    const commentCounts: Record<string, number> = {};
    (allComments || []).forEach(c => { if (c.post_id) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });
    const enriched: FeedPost[] = postsData.map(post => {
      const pr = allReactions?.filter(r => r.content_id === post.id) || [];
      const reactions = { amen: 0, feu: 0, coeur: 0 };
      const user_reactions: Record<string, boolean> = {};
      pr.forEach(r => { if (r.type in reactions) reactions[r.type as keyof typeof reactions]++; if (r.author_id === user?.id) user_reactions[r.type] = true; });
      const p = profileMap[post.author_id];
      const name = p?.name || "Membre MIREC";
      return { ...post, type: post.type || "post", author_name: name, author_initials: name.slice(0, 2).toUpperCase(), author_avatar: p?.avatar || null, image_url: (post as any).image_url || null, reactions, user_reactions, comments_count: commentCounts[post.id] || 0 };
    });
    setPosts(enriched);
    setLoadingPosts(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchFlashes(); fetchPosts(); }, [fetchFlashes, fetchPosts]);

  const handleReact = async (postId: string, key: "amen" | "feu" | "coeur") => {
    if (!user) { navigate("/auth"); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasActive = post.user_reactions[key];
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, reactions: { ...p.reactions, [key]: p.reactions[key] + (wasActive ? -1 : 1) }, user_reactions: { ...p.user_reactions, [key]: !wasActive } }));
    if (wasActive) await supabase.from("reactions").delete().eq("content_id", postId).eq("author_id", user.id).eq("type", key);
    else await supabase.from("reactions").insert({ content_id: postId, author_id: user.id, type: key });
  };

  const handleNewPost = async (data: { content: string; type: string; imageUrl?: string }) => {
    if (!user) { navigate("/auth"); return; }
    const payload: Record<string, any> = { content: data.content, type: data.type, author_id: user.id };
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

  const filters = [{ key: "all", label: "Tout" }, { key: "announcement", label: "📢 Annonces" }, { key: "testimony", label: "✨ Témoignages" }, { key: "prayer", label: "🙏 Prières" }, { key: "podcast", label: "🎙️ Podcasts" }];
  const filteredPosts = filter === "all" ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="min-h-screen pb-20 relative bg-background">

      {/* Décoration douce en fond */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "-8%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, hsl(var(--mirec-purple) / 0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "40%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }} />
      </div>

      {/* STYLES ANIMATIONS */}
      <style>{`
        @keyframes amen-particle { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-primary/20 px-4 py-3 relative bg-background/90 backdrop-blur-xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MirecLogo size={36} />
            <div>
              <h1 className="font-display text-xl font-bold tracking-wide text-foreground leading-none">MIREC</h1>
              <p className="text-[9px] text-primary/70 font-medium tracking-wider uppercase">Communauté de foi</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchPosts(true)} disabled={refreshing} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button className="relative p-2 rounded-full hover:bg-primary/10 transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-card" />
            </button>
          </div>
        </div>
      </header>

      {/* ── SECTION FLASH — style Facebook Stories ── */}
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-5 pb-3">

        {/* Titre + bouton */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">✨ Flash du jour</span>
            {flashes.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-primary-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--mirec-purple)))" }}>
                {flashes.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { if (!user) { navigate("/auth"); return; } setShowNewFlash(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-primary-foreground transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--mirec-purple)))", boxShadow: "0 2px 8px hsl(var(--primary) / 0.3)" }}>
            ✨ Partager
          </button>
        </div>

        {loadingFlashes ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 rounded-2xl animate-pulse bg-muted"
                style={{ width: 100, height: 160 }} />
            ))}
          </div>
        ) : flashes.length === 0 ? (
          /* État vide */
          <div className="flex items-center gap-3 py-4 px-4 rounded-2xl bg-primary/10 border border-dashed border-primary/40">
            <span className="text-2xl">🙏</span>
            <div>
              <p className="text-xs font-semibold text-foreground">Aucun flash aujourd'hui</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sois le premier à partager une victoire !</p>
            </div>
          </div>
        ) : (
          /* ── STORIES RECTANGULAIRES — scroll horizontal ── */
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">

            {/* Bouton + Ajouter ton flash */}
            <button
              onClick={() => { if (!user) { navigate("/auth"); return; } setShowNewFlash(true); }}
              className="flex-shrink-0 relative overflow-hidden flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all active:scale-95"
              style={{
                width: 100, height: 160, borderRadius: 14,
                borderColor: "rgba(245,158,11,0.5)",
                background: "linear-gradient(160deg, rgba(251,191,36,0.08), rgba(239,68,68,0.06))",
              }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                <Plus className="w-5 h-5 text-white" />
              </div>
              <p className="text-[10px] font-semibold text-center text-amber-700 px-2 leading-tight">Ajouter un flash</p>
            </button>

            {/* Flash Cards */}
            {flashes.map(flash => (
              <FlashCard key={flash.id} flash={flash} onOpen={setSelectedFlash} onAmen={handleAmen} />
            ))}
          </div>
        )}
      </div>

      {/* ── FILTRES ── */}
      <div className="sticky top-[61px] z-20 border-b px-4 py-2.5 relative"
        style={{ background: "rgba(255,251,240,0.92)", backdropFilter: "blur(16px)", borderColor: "rgba(251,191,36,0.15)" }}>
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={filter === f.key ? {
                background: "linear-gradient(135deg, #1A4B9B, #7C3AED)", color: "#fff",
                boxShadow: "0 2px 8px rgba(26,75,155,0.3)",
              } : {
                background: "rgba(0,0,0,0.06)", color: "#374151",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PAGE PODCAST ── */}
      {filter === "podcast" && <div className="relative z-10"><Podcast /></div>}

      {/* ── LISTE POSTS ── */}
      <div className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-4">
        {filter === "podcast" ? null
        : loadingPosts ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-xs text-gray-400">Chargement du fil...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <Sparkles className="w-8 h-8 text-amber-400/60" />
            </div>
            <p className="font-semibold text-gray-700">Aucun post ici</p>
            <p className="text-sm text-gray-400">Sois le premier à partager quelque chose !</p>
          </div>
        ) : filteredPosts.map(post => {
          const tc = typeConfig(post.type);
          const isAuthor  = user?.id === post.author_id;
          const isEditing = editingPost === post.id;
          return (
            <div key={post.id} className="rounded-2xl overflow-hidden bg-white transition-all hover:shadow-md"
              style={{ border: `1px solid ${tc.border}`, boxShadow: `0 2px 12px rgba(0,0,0,0.06)` }}>

              {/* Bandeau couleur */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${tc.color}, ${tc.color}88)` }} />

              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <PostAvatar avatarUrl={post.author_avatar} initials={post.author_initials} size={42}
                    onClick={() => setPhotoModal({ url: post.author_avatar, name: post.author_name, initials: post.author_initials })} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setProfileModal({ userId: post.author_id, name: post.author_name, initials: post.author_initials, avatar: post.author_avatar })}
                      className="text-sm font-bold text-gray-800 hover:text-primary hover:underline text-left block truncate">
                      {post.author_name}
                    </button>
                    <p className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: tc.color, backgroundColor: tc.bg, border: `1px solid ${tc.border}` }}>
                    {tc.label}
                  </span>
                  {isAuthor && (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} className="p-1.5 rounded-full hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {menuOpen === post.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[140px]">
                            <button onClick={() => startEdit(post)} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <Pencil className="w-3.5 h-3.5" /> Modifier
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50">
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
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={3} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingPost(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100">
                        <X className="w-3.5 h-3.5" /> Annuler
                      </button>
                      <button onClick={() => saveEdit(post.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium">
                        <Check className="w-3.5 h-3.5" /> Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 space-y-3">
                    {post.content && (
                      <div className="rounded-xl px-3.5 py-3" style={{ background: tc.gradient }}>
                        <p className="text-sm text-gray-800 leading-relaxed">{post.content}</p>
                      </div>
                    )}
                    {post.image_url && (
                      <div className="rounded-xl overflow-hidden border border-gray-100">
                        <img src={post.image_url} alt="" className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setPhotoModal({ url: post.image_url, name: post.author_name, initials: post.author_initials })} />
                      </div>
                    )}
                  </div>
                )}

                {/* Réactions */}
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: `${tc.border}88` }}>
                  {([
                    { key: "amen"  as const, emoji: "🙏", activeColor: "#7C3AED" },
                    { key: "feu"   as const, emoji: "🔥", activeColor: "#D97706" },
                    { key: "coeur" as const, emoji: "❤️", activeColor: "#e11d48" },
                  ]).map(r => (
                    <button key={r.key} onClick={() => handleReact(post.id, r.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-90"
                      style={post.user_reactions[r.key] ? {
                        background: `${r.activeColor}15`, color: r.activeColor, border: `1.5px solid ${r.activeColor}44`,
                      } : {
                        background: "#f3f4f6", color: "#6b7280", border: "1.5px solid transparent",
                      }}>
                      <span className="text-sm leading-none">{r.emoji}</span>
                      <span>{post.reactions[r.key]}</span>
                    </button>
                  ))}
                </div>

                <FeedCommentSection postId={post.id} commentsCount={post.comments_count} userId={user?.id} postAuthorId={post.author_id} />
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNewPost(true); }}
        className="fixed bottom-20 right-4 sm:right-[calc(50%-224px)] w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30"
        style={{ background: "linear-gradient(135deg, #1A4B9B, #7C3AED)", boxShadow: "0 4px 20px rgba(26,75,155,0.4)" }}>
        <Plus className="w-6 h-6" />
      </button>

      {/* MODALS */}
      {showNewPost  && <NewPostModal  onClose={() => setShowNewPost(false)}  onSubmit={handleNewPost} />}
      {showNewFlash && <NewFlashModal onClose={() => setShowNewFlash(false)} onSubmit={handleNewFlash} />}
      {photoModal   && <PhotoModal    avatarUrl={photoModal.url} name={photoModal.name} initials={photoModal.initials} onClose={() => setPhotoModal(null)} />}
      {profileModal && <UserProfileModal userId={profileModal.userId} name={profileModal.name} initials={profileModal.initials} avatarUrl={profileModal.avatar} onTabChange={onTabChange} onClose={() => setProfileModal(null)} onViewPhoto={() => { setPhotoModal({ url: profileModal.avatar, name: profileModal.name, initials: profileModal.initials }); setProfileModal(null); }} />}
      {selectedFlash && <FlashDetail flash={selectedFlash} onClose={() => setSelectedFlash(null)} onAmen={handleAmen} />}
      {particles.map(p => <AmenParticles key={p.id} x={p.x} y={p.y} onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))} />)}
    </div>
  );
}
