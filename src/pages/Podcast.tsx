import { useState, useEffect, useRef } from "react";
// useNavigate n'est pas utilisé → supprimé
import supabase from "@/integrations/supabase/client";   // ← export par défaut
import useAuth from "@/hooks/useAuth";                 // ← export par défaut
import {
  Radio, Check, X,
  Play, Pause, ArrowLeft, SkipBack, SkipForward,
  Video, Youtube,
  Eye, Send, MessageCircle, Wifi
} from "lucide-react";

// ================================================================
// INTERFACES
// ================================================================
interface Channel {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  category: string;
  is_verified: boolean;
  is_live: boolean;
  created_at: string;
  episode_count?: number;
  subscriber_count?: number;
  is_subscribed?: boolean;
}

interface Episode {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  video_url?: string | null;
  youtube_url?: string | null;
  media_type?: "audio" | "video" | "youtube";
  cover_url: string | null;
  duration_sec: number;
  serie: string | null;
  episode_num: number;
  plays: number;
  created_at: string;
  channel_name?: string;
  progress_sec?: number;
}

interface Live {
  id: string;
  channel_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  youtube_live_url: string | null;
  status: "scheduled" | "live" | "ended";
  viewer_count: number;
  started_at: string | null;
  channel_name?: string;
  channel_cover?: string | null;
}

interface LiveMessage {
  id: string;
  live_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

// ================================================================
// UTILITAIRES
// ================================================================
function formatDuration(sec: number): string {
  if (!sec) return "--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `il y a ${Math.floor(d / 60)}min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`;
  return `il y a ${Math.floor(d / 86400)}j`;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

const CAT: Record<string, { label: string; emoji: string; color: string }> = {
  enseignement: { label: "Enseignement", emoji: "📖", color: "#1A4B9B" },
  predication: { label: "Prédication", emoji: "⛪", color: "#f59e0b" },
  radio: { label: "Radio", emoji: "📻", color: "#059669" },
  jeunesse: { label: "Jeunesse", emoji: "🔥", color: "#D97706" },
  autre: { label: "Autre", emoji: "✨", color: "#6B7280" },
};

// ================================================================
// BADGE MEDIA TYPE
// ================================================================
function MediaBadge({ type }: { type?: string }) {
  if (type === "youtube") {
    return (
      <span
        className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(220,38,38,0.2)", color: "#f87171" }}
      >
        <Youtube className="w-2.5 h-2.5" /> YouTube
      </span>
    );
  }
  if (type === "video") {
    return (
      <span
        className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}
      >
        <Video className="w-2.5 h-2.5" /> Vidéo
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: "rgba(5,150,105,0.2)", color: "#34d399" }}
    >
      <Radio className="w-2.5 h-2.5" /> Audio
    </span>
  );
}

// ================================================================
// LECTEUR AUDIO
// ================================================================
export function AudioPlayer({ episode, onClose }: { episode: Episode; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(episode.progress_sec || 0);
  const [duration, setDuration] = useState(episode.duration_sec || 0);
  const [expanded, setExpanded] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!audioRef.current || !episode.audio_url) return;
    audioRef.current.src = episode.audio_url;
    audioRef.current.currentTime = episode.progress_sec || 0;
    audioRef.current.playbackRate = speed;
    setCurrent(episode.progress_sec || 0);
    setPlaying(false);
  }, [episode.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  };

  const share = async () => {
    const url = episode.audio_url || window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: episode.title, text: episode.channel_name, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Lien copié 📋"); } catch {}
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const skip = (s: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, current + s));
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = v;
    setCurrent(v);
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrent(Math.floor((e.target as HTMLAudioElement).currentTime))}
        onLoadedMetadata={e => setDuration(Math.floor((e.target as HTMLAudioElement).duration))}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="fixed bottom-20 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(135deg,#0d0820ee,#1a0838ee)",
              border: "1px solid rgba(245,158,11,0.4)",
              backdropFilter: "blur(20px)"
            }}
          >
            <div className="h-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }}
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setExpanded(true)}
                className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                {episode.cover_url ? (
                  <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-5 h-5 text-white m-auto mt-2.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{episode.title}</p>
                <p className="text-[10px] text-white/50">{episode.channel_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => skip(-15)} className="p-1.5 rounded-full hover:bg-white/10">
                  <SkipBack className="w-4 h-4 text-white/70" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                >
                  {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <button onClick={() => skip(30)} className="p-1.5 rounded-full hover:bg-white/10">
                  <SkipForward className="w-4 h-4 text-white/70" />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div
          className="fixed inset-0 z-[80] flex flex-col"
          style={{ background: "linear-gradient(160deg,#0d0820,#1a0838)" }}
        >
          <div className="flex items-center justify-between px-5 pt-12 pb-4">
            <button onClick={() => setExpanded(false)} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">En écoute</p>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
            <div
              className="w-56 h-56 rounded-3xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 20px 60px rgba(245,158,11,0.5)" }}
            >
              {episode.cover_url ? (
                <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                >
                  <Radio className="w-20 h-20 text-white/60" />
                </div>
              )}
            </div>
            <div className="text-center">
              <h2 className="font-bold text-xl text-white mb-1">{episode.title}</h2>
              <p className="text-sm text-white/50">{episode.channel_name}</p>
              {episode.serie && (
                <p className="text-xs text-amber-400 mt-1">
                  📚 {episode.serie} · Ép. {episode.episode_num}
                </p>
              )}
            </div>
            <div className="w-full space-y-2">
              <input
                type="range"
                min={0}
                max={duration}
                value={current}
                onChange={seek}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right,#f59e0b ${pct}%,rgba(255,255,255,0.15) ${pct}%)` }}
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>{formatDuration(current)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <button onClick={() => skip(-15)} className="flex flex-col items-center gap-1">
                <SkipBack className="w-6 h-6 text-white/60" />
                <span className="text-[9px] text-white/30">-15s</span>
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  boxShadow: "0 8px 32px rgba(245,158,11,0.6)"
                }}
              >
                {playing ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
              </button>
              <button onClick={() => skip(30)} className="flex flex-col items-center gap-1">
                <SkipForward className="w-6 h-6 text-white/60" />
                <span className="text-[9px] text-white/30">+30s</span>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={cycleSpeed}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.45)" }}>
                {speed}x
              </button>
              <button onClick={share}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/80 hover:text-white"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                Partager
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ================================================================
// LECTEUR VIDEO
// ================================================================
export function VideoPlayer({ episode, onClose }: { episode: Episode; onClose: () => void }) {
  const ytId = episode.youtube_url ? extractYouTubeId(episode.youtube_url) : null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-3"
        style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.85),transparent)" }}
      >
        <button onClick={onClose} className="p-2 rounded-full bg-black/50 hover:bg-white/20">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 mx-3">
          <p className="text-sm font-bold text-white truncate">{episode.title}</p>
          <p className="text-[10px] text-white/50">{episode.channel_name}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-black/50 hover:bg-white/20">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            className="w-full"
            style={{ height: "56.25vw", maxHeight: "calc(100vh - 120px)" }}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : episode.video_url ? (
          <video src={episode.video_url} controls autoPlay className="w-full max-h-[calc(100vh-120px)]" />
        ) : (
          <div className="text-white/40 text-sm">Vidéo non disponible</div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// VUE LIVE
// ================================================================
export function LiveView({ live, onClose }: { live: Live; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [viewers, setViewers] = useState(live.viewer_count || 0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ytId = live.youtube_live_url ? extractYouTubeId(live.youtube_live_url) : null;

  useEffect(() => {
    (supabase.from("podcast_live_messages" as any)
      .select("*, profiles(full_name, avatar_url)")
      .eq("live_id", live.id)
      .order("created_at", { ascending: true })
      .limit(100) as any)
      .then(({ data }: any) => {
        if (data) {
          setMessages(data.map((m: any) => ({
            ...m,
            author_name: m.profiles?.full_name || "Membre",
            author_avatar: m.profiles?.avatar_url || null,
          })));
        }
      });
  }, [live.id]);

  useEffect(() => {
    const channel = supabase.channel(`live-chat-${live.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "podcast_live_messages",
        filter: `live_id=eq.${live.id}`
      }, async (payload) => {
        const msg = payload.new as any;
        const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", msg.user_id).single();
        setMessages(prev => [...prev, {
          ...msg,
          author_name: prof?.full_name || "Membre",
          author_avatar: prof?.avatar_url || null
        }]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "podcast_lives",
        filter: `id=eq.${live.id}`
      }, (payload) => {
        setViewers((payload.new as any).viewer_count || 0);
      })
      .subscribe();

    supabase.from("podcast_lives" as any).update({ viewer_count: live.viewer_count + 1 } as any).eq("id", live.id);
    return () => {
      supabase.removeChannel(channel);
      supabase.from("podcast_lives" as any).update({ viewer_count: Math.max(0, viewers - 1) } as any).eq("id", live.id);
    };
  }, [live.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || sending) return;
    setSending(true);
    const content = newMsg.trim().slice(0, 200);
    setNewMsg("");
    await (supabase.from("podcast_live_messages" as any).insert({
      live_id: live.id,
      user_id: user.id,
      content
    } as any) as any);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-2"
        style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.9),transparent)" }}
      >
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white animate-pulse"
              style={{ background: "rgba(220,38,38,0.9)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
            </span>
            <p className="text-sm font-bold text-white truncate">{live.title}</p>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Eye className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/40">
              {viewers} spectateur{viewers !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full bg-black flex-shrink-0" style={{ height: "52vw", maxHeight: 280 }}>
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&live_stream=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg,#0d0820,#1a0838)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(220,38,38,0.2)", border: "2px solid rgba(220,38,38,0.5)" }}
            >
              <Wifi className="w-8 h-8 text-red-400 animate-pulse" />
            </div>
            <p className="text-white font-bold text-sm">{live.title}</p>
            <p className="text-white/40 text-xs">Diffusion en cours</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ background: "rgba(13,8,32,0.95)" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <MessageCircle className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-xs text-white/30">Sois le premier à commenter 👋</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="flex items-start gap-2">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              {msg.author_avatar ? (
                <img src={msg.author_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-[8px] flex items-center justify-center w-full h-full">
                  {(msg.author_name || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-amber-300">{msg.author_name} </span>
              <span className="text-xs text-white/80">{msg.content}</span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div
        className="px-3 py-3 border-t"
        style={{ background: "rgba(13,8,32,0.98)", borderColor: "rgba(245,158,11,0.2)" }}
      >
        {user ? (
          <div className="flex gap-2 items-center">
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Réagis en direct..."
              maxLength={200}
              className="flex-1 px-4 py-2.5 rounded-full text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-white/30 py-2">Connecte-toi pour participer au chat</p>
        )}
      </div>
    </div>
  );
}

// ================================================================
// CARTE EPISODE
// ================================================================
function EpisodeCard({ episode, onPlay, isPlaying }: { episode: Episode; onPlay: (ep: Episode) => void; isPlaying: boolean }) {
  const isVideo = episode.media_type === "video" || episode.media_type === "youtube";
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: isPlaying ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isPlaying ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`
      }}
      onClick={() => onPlay(episode)}
    >
      <div
        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative"
        style={{ background: "linear-gradient(135deg,#f59e0b44,#d9770644)" }}
      >
        {episode.cover_url ? (
          <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? <Video className="w-5 h-5 text-amber-400" /> : <Radio className="w-5 h-5 text-amber-400" />}
          </div>
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{episode.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {episode.serie && (
            <p className="text-[10px] text-amber-400">📚 {episode.serie} · Ép. {episode.episode_num}</p>
          )}
          <MediaBadge type={episode.media_type} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {episode.media_type !== "youtube" && (
            <span className="text-[10px] text-white/40">{formatDuration(episode.duration_sec)}</span>
          )}
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{episode.plays} écoutes</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{timeAgo(episode.created_at)}</span>
        </div>
      </div>
      <button
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isPlaying ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.08)"
        }}
      >
        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
    </div>
  );
}

// ================================================================
// VUE CANAL
// ================================================================
export function ChannelView({
  channel,
  onBack,
  onPlay,
  currentEpisode,
  onStartLive
}: {
  channel: Channel;
  onBack: () => void;
  onPlay: (ep: Episode) => void;
  currentEpisode: Episode | null;
  onStartLive?: () => void;
}) {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(channel.is_subscribed || false);
  const isOwner = user?.id === channel.creator_id;
  const c = CAT[channel.category] || CAT.autre;

  useEffect(() => {
    (supabase.from("podcast_episodes" as any)
      .select("*")
      .eq("channel_id", channel.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false }) as any)
      .then(({ data }: any) => {
        setEpisodes((data || []).map((e: any) => ({ ...e, channel_name: channel.name })));
        setLoading(false);
      });
  }, [channel.id]);

  const toggleSub = async () => {
    if (!user) return;
    if (subscribed) {
      await (supabase.from("podcast_subscriptions" as any).delete().eq("user_id", user.id).eq("channel_id", channel.id) as any);
    } else {
      await (supabase.from("podcast_subscriptions" as any).insert({ user_id: user.id, channel_id: channel.id }) as any);
    }
    setSubscribed(!subscribed);
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "linear-gradient(160deg,#0d0820,#1a0838,#0d0820)" }}>
      <div className="relative">
        <div className="h-36 w-full" style={{ background: `linear-gradient(135deg,${c.color}44,#f59e0b44)` }}>
          {channel.cover_url && <img src={channel.cover_url} alt="" className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 40%,#0d0820 100%)" }} />
        </div>
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-full"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="px-5 pb-4 -mt-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-xl text-white truncate">{channel.name}</h2>
                {channel.is_verified && <Check className="w-4 h-4 text-blue-400" />}
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: c.color + "33", color: c.color }}
              >
                {c.emoji} {c.label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={onStartLive}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: "rgba(220,38,38,0.8)", border: "1px solid rgba(220,38,38,0.5)" }}
                >
                  <Wifi className="w-3.5 h-3.5" /> Démarrer Live
                </button>
              )}
              {user && (
                <button
                  onClick={toggleSub}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{
                    background: subscribed ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    border: subscribed ? "1px solid rgba(255,255,255,0.2)" : "none"
                  }}
                >
                  {subscribed ? <Check className="w-3.5 h-3.5" /> : null}
                  {subscribed ? "Abonné" : "S'abonner"}
                </button>
              )}
            </div>
          </div>
          {channel.description && (
            <p className="text-xs text-white/60 mt-4 leading-relaxed">{channel.description}</p>
          )}
        </div>
      </div>

      {/* Liste des Épisodes du Canal */}
      <div className="px-5 mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-white/40 mb-3 uppercase tracking-wider">Épisodes disponibles</h3>
        {loading ? (
          <p className="text-xs text-white/40 text-center py-6">Chargement des épisodes...</p>
        ) : episodes.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-6">Aucun épisode publié pour le moment.</p>
        ) : (
          episodes.map(ep => (
            <EpisodeCard
              key={ep.id}
              episode={ep}
              onPlay={onPlay}
              isPlaying={currentEpisode?.id === ep.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
