import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, ChevronRight, Check, X,
  Play, Pause, ArrowLeft, SkipBack, SkipForward,
  Bell, BellOff, Lock, Video, Youtube,
  Eye, Send, MessageCircle, Wifi, WifiOff, Search
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

function ChevRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

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
function AudioPlayer({ episode, onClose }: { episode: Episode; onClose: () => void }) {
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
// LECTEUR VIDEO (mp4 ou YouTube embed)
// ================================================================
function VideoPlayer({ episode, onClose }: { episode: Episode; onClose: () => void }) {
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
// VUE LIVE avec chat Realtime
// ================================================================
function LiveView({ live, onClose }: { live: Live; onClose: () => void }) {
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
      {/* Header */}
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

      {/* Video zone */}
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

      {/* Chat */}
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

      {/* Saisie */}
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
// CARTE LIVE
// ================================================================
function LiveCard({ live, onOpen }: { live: Live; onOpen: (l: Live) => void }) {
  return (
    <button
      onClick={() => onOpen(live)}
      className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.35)" }}
    >
      <div
        className="relative w-full h-28 flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1a0820,#2d0a0a)" }}
      >
        {live.channel_cover && (
          <img src={live.channel_cover} alt="" className="w-full h-full object-cover opacity-40 absolute inset-0" />
        )}
        <div
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.3)", border: "2px solid rgba(220,38,38,0.6)" }}
        >
          <Wifi className="w-6 h-6 text-red-400 animate-pulse" />
        </div>
        <span
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: "rgba(220,38,38,0.9)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
        </span>
        <span
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <Eye className="w-2.5 h-2.5" /> {live.viewer_count}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="font-bold text-sm text-white truncate">{live.title}</p>
        {live.channel_name && <p className="text-[11px] text-red-300/70 mt-0.5">{live.channel_name}</p>}
        {live.description && <p className="text-xs text-white/40 mt-1 line-clamp-2">{live.description}</p>}
        <p className="text-[10px] text-white/30 mt-2">
          {live.started_at ? `Commencé ${timeAgo(live.started_at)}` : "Bientôt"}
        </p>
      </div>
    </button>
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
function ChannelView({
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                  style={subscribed
                    ? { background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.4)" }
                    : { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }
                  }
                >
                  {subscribed ? <><BellOff className="w-3.5 h-3.5" />Abonné</> : <><Bell className="w-3.5 h-3.5" />S'abonner</>}
                </button>
              )}
            </div>
          </div>
          {channel.description && <p className="text-xs text-white/50 mt-2">{channel.description}</p>}
        </div>
      </div>
      <div className="px-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Épisodes</p>
        {loading
          ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : episodes.length === 0
            ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Radio className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/50">Aucun épisode pour l'instant</p>
              </div>
            )
            : (
              <div className="space-y-2">
                {episodes.map(ep => (
                  <EpisodeCard key={ep.id} episode={ep} isPlaying={currentEpisode?.id === ep.id} onPlay={onPlay} />
                ))}
              </div>
            )
        }
      </div>
    </div>
  );
}

// ================================================================
// MODAL DÉMARRER UN LIVE
// ================================================================
function StartLiveModal({ channel, onClose, onStarted }: { channel: Channel; onClose: () => void; onStarted: (live: Live) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!title.trim() || !user) return;
    setStarting(true);
    const { data, error } = await (supabase.from("podcast_lives" as any).insert({
      channel_id: channel.id,
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      youtube_live_url: ytUrl.trim() || null,
      status: "live",
      started_at: new Date().toISOString(),
    }).select().single() as any);
    if (!error && data) {
      await (supabase.from("podcast_channels" as any).update({ is_live: true } as any).eq("id", channel.id) as any);
      onStarted({ ...(data as any), channel_name: channel.name, channel_cover: channel.cover_url });
    }
    setStarting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto px-5 pb-8"
        style={{
          maxHeight: "85vh",
          background: "rgba(15,8,40,0.97)",
          border: "1px solid rgba(220,38,38,0.3)",
          borderBottom: "none"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between py-4 border-b mb-5" style={{ borderColor: "rgba(220,38,38,0.2)" }}>
          <div>
            <h3 className="font-bold text-lg text-white">🔴 Démarrer un Live</h3>
            <p className="text-xs text-white/50 mt-0.5">{channel.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/70 mb-1 block">Titre du Live *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Culte du dimanche, Étude biblique..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70 mb-1 block">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="De quoi parle ce live ?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70 mb-1 block flex items-center gap-1">
              <Youtube className="w-3.5 h-3.5 text-red-400" /> Lien YouTube Live (optionnel)
            </label>
            <input
              value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}
            />
            <p className="text-[10px] text-white/30 mt-1">Colle ici le lien de ta diffusion YouTube en direct</p>
          </div>
          <button
            onClick={handleStart}
            disabled={!title.trim() || starting}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#DC2626,#ef4444)", boxShadow: "0 4px 20px rgba(220,38,38,0.4)" }}
          >
            {starting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Wifi className="w-4 h-4" /> Démarrer maintenant</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// MODAL DEMANDE CRÉATEUR
// ================================================================
function CreatorRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    ministry: "",
    creator_type: "pasteur",
    description: "",
    contact: ""
  });

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.full_name || !form.ministry || !form.description || !form.contact) return;
    if (!user) {
      setErrorMsg("Vous devez être connecté.");
      return;
    }
    setSending(true);
    setErrorMsg("");
    try {
      const { data: ex } = await (supabase.from("podcast_creator_requests" as any)
        .select("id,status")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (ex) {
        setErrorMsg((ex as any).status === "pending" ? "Demande déjà en attente ⏳" : "Tu as déjà fait une demande");
        setSending(false);
        return;
      }
      const { error } = await (supabase.from("podcast_creator_requests" as any).insert({
        user_id: user.id,
        email: user.email || "",
        ...form,
        status: "pending"
      }) as any);
      if (error) throw error;
      setStep("success");
      onSuccess();
    } catch {
      setErrorMsg("Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => !sending && onClose()}>
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{
          maxHeight: "90vh",
          background: "rgba(15,8,40,0.97)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderBottom: "none"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {step === "success" ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}
            >
              <Check className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">Demande envoyée !</h3>
            <p className="text-sm text-white/60">L'équipe MIREC te contactera sous 48–72h.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between py-4 border-b mb-5" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <div>
                <h3 className="font-bold text-lg text-white">Devenir créateur</h3>
                <p className="text-xs text-white/50 mt-0.5">Remplis ce formulaire</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Nom complet *</label>
                <input
                  value={form.full_name}
                  onChange={field("full_name")}
                  placeholder="Pasteur Jean..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Ministère *</label>
                <input
                  value={form.ministry}
                  onChange={field("ministry")}
                  placeholder="Radio Lumière…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Contact *</label>
                <input
                  value={form.contact}
                  onChange={field("contact")}
                  placeholder="+229 96 00 00 00"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Type de contenu</label>
                <select
                  value={form.creator_type}
                  onChange={field("creator_type")}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  <option value="pasteur">⛪ Pasteur</option>
                  <option value="radio">📻 Radio</option>
                  <option value="enseignant">📖 Enseignant</option>
                  <option value="evangeliste">📣 Évangéliste</option>
                  <option value="autre">✨ Autre</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Description *</label>
                <textarea
                  value={form.description}
                  onChange={field("description")}
                  placeholder="Décris ton ministère…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
                />
              </div>
              {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}
              <button
                onClick={handleSubmit}
                disabled={sending || !form.full_name || !form.ministry || !form.description || !form.contact}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Envoyer ma demande →"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function Podcast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentVideoEpisode, setCurrentVideoEpisode] = useState<Episode | null>(null);
  const [activeLive, setActiveLive] = useState<Live | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showStartLive, setShowStartLive] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "lives" | "subscriptions">("discover");
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => setIsAdmin(data?.role === "admin"));
    (supabase.from("podcast_channels" as any).select("id").eq("creator_id", user.id).maybeSingle() as any)
      .then(({ data }: any) => setIsCreator(!!data));
    (supabase.from("podcast_creator_requests" as any).select("status").eq("user_id", user.id).maybeSingle() as any)
      .then(({ data }: any) => { if (data) setRequestStatus((data as any).status); });
  }, [user]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("podcast_channels" as any).select("*").order("created_at", { ascending: false }) as any);
    if (error) {
      setLoading(false);
      return;
    }
    const enriched = await Promise.all((data || []).map(async (ch: any) => {
      const [epR, subR, myR] = await Promise.all([
        (supabase.from("podcast_episodes" as any).select("id", { count: "exact", head: true }).eq("channel_id", ch.id) as any),
        (supabase.from("podcast_subscriptions" as any).select("id", { count: "exact", head: true }).eq("channel_id", ch.id) as any),
        user ? (supabase.from("podcast_subscriptions" as any).select("id").eq("channel_id", ch.id).eq("user_id", user.id).maybeSingle() as any) : Promise.resolve({ data: null }),
      ]);
      return {
        ...ch,
        episode_count: epR.count || 0,
        subscriber_count: subR.count || 0,
        is_subscribed: !!myR.data,
      };
    }));
    setChannels(enriched);
    setLoading(false);
  }, [user]);

  const fetchLives = useCallback(async () => {
    const { data } = await (supabase.from("podcast_lives" as any)
      .select("*, podcast_channels(name, cover_url)")
      .eq("status", "live")
      .order("started_at", { ascending: false }) as any);
    if (data) {
      setLives((data as any[]).map((l: any) => ({
        ...l,
        channel_name: l.podcast_channels?.name || "",
        channel_cover: l.podcast_channels?.cover_url || null,
      })));
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    const { data } = await (supabase.from("podcast_episodes" as any)
      .select("*, podcast_channels(name)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(6) as any);
    if (data) {
      setRecentEpisodes((data as any[]).map((e: any) => ({ ...e, channel_name: e.podcast_channels?.name || "" })));
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchLives();
    fetchRecent();
  }, [fetchChannels, fetchLives, fetchRecent]);

  // Realtime: nouveaux lives
  useEffect(() => {
    const ch = supabase.channel("lives-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "podcast_lives" }, fetchLives)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLives]);

  const handlePlayEpisode = (ep: Episode) => {
    if (ep.media_type === "video" || ep.media_type === "youtube") {
      setCurrentVideoEpisode(ep);
      setCurrentEpisode(null);
    } else {
      setCurrentEpisode(ep);
      setCurrentVideoEpisode(null);
    }
  };

  const mySubs = channels.filter(c => c.is_subscribed);
  const cat = (k: string) => CAT[k] || CAT.autre;

  if (activeLive) return <LiveView live={activeLive} onClose={() => setActiveLive(null)} />;
  if (currentVideoEpisode) return <VideoPlayer episode={currentVideoEpisode} onClose={() => setCurrentVideoEpisode(null)} />;

  if (selectedChannel) {
    return (
      <>
        <ChannelView
          channel={selectedChannel}
          onBack={() => setSelectedChannel(null)}
          onPlay={handlePlayEpisode}
          currentEpisode={currentEpisode}
          onStartLive={() => setShowStartLive(true)}
        />
        {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
        {showStartLive && (
          <StartLiveModal
            channel={selectedChannel}
            onClose={() => setShowStartLive(false)}
            onStarted={(live) => {
              setShowStartLive(false);
              setActiveLive(live);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen pb-36" style={{ background: "linear-gradient(160deg,#0d0820,#1a0838,#0d0820)" }}>
      {/* HEADER */}
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "rgba(13,8,32,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <div>
              <h1 className="font-bold text-base text-white leading-none">Podcast MIREC</h1>
              <p className="text-[10px] text-white/40">Enseignements · Prédications · Lives</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => navigate("/admin")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                Admin
              </button>
            )}
            {isCreator && (
              <button onClick={() => navigate("/creator-dashboard")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-600 text-white">
                Créateur
              </button>
            )}
            {user && (requestStatus === "pending" ? (
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-yellow-300" style={{ background: "rgba(217,119,6,0.2)", border: "1px solid rgba(217,119,6,0.3)" }}>
                ⏳ En attente
              </div>
            ) : requestStatus === "approved" ? (
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-green-300" style={{ background: "rgba(5,150,105,0.2)", border: "1px solid rgba(5,150,105,0.3)" }}>
                ✅ Créateur
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 2px 8px rgba(245,158,11,0.4)" }}
              >
                <Mic2 className="w-3.5 h-3.5" /> Créateur
              </button>
            ))}
          </div>
        </div>
        {/* ONGLETS */}
        <div className="max-w-lg mx-auto flex gap-1 mt-2">
          {[
            { key: "discover", label: "Découvrir" },
            { key: "lives", label: `🔴 Lives${lives.length > 0 ? ` (${lives.length})` : ""}` },
            { key: "subscriptions", label: `Abonnements${mySubs.length > 0 ? ` (${mySubs.length})` : ""}` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key ? "text-white" : "text-white/40 bg-white/5"}`}
              style={activeTab === tab.key ? { background: "linear-gradient(135deg,#f59e0b44,#d9770644)", border: "1px solid rgba(245,158,11,0.4)" } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* ===== DÉCOUVRIR ===== */}
        {activeTab === "discover" && (
          <>
            {lives.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" /> En direct maintenant
                </p>
                <div className="space-y-3">
                  {lives.map(live => <LiveCard key={live.id} live={live} onOpen={setActiveLive} />)}
                </div>
              </div>
            )}
            {recentEpisodes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Récemment ajoutés</p>
                <div className="space-y-2">
                  {recentEpisodes.map(ep => (
                    <EpisodeCard key={ep.id} episode={ep} isPlaying={currentEpisode?.id === ep.id} onPlay={handlePlayEpisode} />
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Canaux disponibles</p>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-4">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <Radio className="w-12 h-12 text-amber-400" />
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-300">Bientôt disponible</span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2">Aucun canal pour l'instant</h3>
                <p className="text-sm text-white/40 leading-relaxed mb-6">Les enseignements arrivent bientôt sur MIREC.</p>
                {user && !requestStatus && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}
                  >
                    <Mic2 className="w-4 h-4" /> Devenir le premier créateur
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((ch: any) => {
                  const c = cat(ch.category);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch)}
                      className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div
                          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ background: `linear-gradient(135deg,${c.color}44,#f59e0b44)` }}
                        >
                          {ch.cover_url ? (
                            <img src={ch.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl">{c.emoji}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="font-bold text-sm text-white truncate">{ch.name}</p>
                            {ch.is_verified && <Check className="w-3.5 h-3.5 text-blue-400" />}
                            {ch.is_live && (
                              <span
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                                style={{ background: "rgba(220,38,38,0.8)" }}
                              >
                                <div className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: c.color + "22", color: c.color }}
                          >
                            {c.emoji} {c.label}
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-white/40">{ch.episode_count} épisodes</span>
                            <span className="text-[10px] text-white/40">{ch.subscriber_count} abonnés</span>
                          </div>
                        </div>
                        <ChevRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== LIVES ===== */}
        {activeTab === "lives" && (
          lives.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
              >
                <WifiOff className="w-8 h-8 text-red-400/50" />
              </div>
              <p className="font-semibold text-white text-sm">Aucun live en cours</p>
              <p className="text-xs text-white/40 mt-1">Reviens plus tard pour les cultes en direct !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lives.map(live => <LiveCard key={live.id} live={live} onOpen={setActiveLive} />)}
            </div>
          )
        )}

        {/* ===== ABONNEMENTS ===== */}
        {activeTab === "subscriptions" && (
          !user ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="w-12 h-12 text-white/20 mb-3" />
              <p className="font-semibold text-white text-sm">Connecte-toi pour voir tes abonnements</p>
            </div>
          ) : mySubs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="w-12 h-12 text-white/20 mb-3" />
              <p className="font-semibold text-white text-sm">Aucun abonnement</p>
              <p className="text-xs text-white/40 mt-1">Abonne-toi à des canaux pour les retrouver ici</p>
              <button
                onClick={() => setActiveTab("discover")}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                Découvrir
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubs.map((ch: any) => {
                const c = cat(ch.category);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch)}
                    className="w-full text-left rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,158,11,0.3)" }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div
                        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ background: `linear-gradient(135deg,${c.color}44,#f59e0b44)` }}
                      >
                        {ch.cover_url ? (
                          <img src={ch.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xl">{c.emoji}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <p className="font-bold text-sm text-white truncate">{ch.name}</p>
                          {ch.is_verified && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-white/40">{ch.episode_count} épisodes</p>
                      </div>
                      <ChevRight className="w-4 h-4 text-white/30" />
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
      {showForm && <CreatorRequestModal onClose={() => setShowForm(false)} onSuccess={() => setRequestStatus("pending")} />}
    </div>
  );
}
