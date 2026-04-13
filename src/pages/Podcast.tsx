import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, ChevronRight, Check, X,
  Play, Pause, ArrowLeft, SkipBack, SkipForward,
  Bell, BellOff, Lock
} from "lucide-react";

interface Channel {
  id: string; creator_id: string; name: string; description: string | null;
  cover_url: string | null; category: string; is_verified: boolean; is_live: boolean;
  created_at: string; episode_count?: number; subscriber_count?: number; is_subscribed?: boolean;
}
interface Episode {
  id: string; channel_id: string; title: string; description: string | null;
  audio_url: string | null; cover_url: string | null; duration_sec: number;
  serie: string | null; episode_num: number; plays: number; created_at: string;
  channel_name?: string; progress_sec?: number;
}

function formatDuration(sec: number): string {
  if (!sec) return "--:--";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `il y a ${Math.floor(d / 60)}min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`;
  return `il y a ${Math.floor(d / 86400)}j`;
}
const CAT: Record<string, { label: string; emoji: string; color: string }> = {
  enseignement: { label: "Enseignement", emoji: "📖", color: "#1A4B9B" },
  predication:  { label: "Prédication",  emoji: "⛪", color: "#7C3AED" },
  radio:        { label: "Radio",        emoji: "📻", color: "#059669" },
  jeunesse:     { label: "Jeunesse",     emoji: "🔥", color: "#D97706" },
  autre:        { label: "Autre",        emoji: "✨", color: "#6B7280" },
};

function AudioPlayer({ episode, onClose }: { episode: Episode; onClose: () => void }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(episode.progress_sec || 0);
  const [duration, setDuration] = useState(episode.duration_sec || 0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !episode.audio_url) return;
    audioRef.current.src = episode.audio_url;
    audioRef.current.currentTime = episode.progress_sec || 0;
    setCurrent(episode.progress_sec || 0); setPlaying(false);
  }, [episode.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play();
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
      <audio ref={audioRef}
        onTimeUpdate={e => setCurrent(Math.floor((e.target as HTMLAudioElement).currentTime))}
        onLoadedMetadata={e => setDuration(Math.floor((e.target as HTMLAudioElement).duration))}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <div className="fixed bottom-20 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(135deg,#0d0820ee,#1a0838ee)", border: "1px solid rgba(139,92,246,0.4)", backdropFilter: "blur(20px)" }}>
            <div className="h-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#7C3AED,#a78bfa)" }} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setExpanded(true)} className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}>
                {episode.cover_url ? <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Radio className="w-5 h-5 text-white" /></div>}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{episode.title}</p>
                <p className="text-[10px] text-white/50">{episode.channel_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => skip(-15)} className="p-1.5 rounded-full hover:bg-white/10"><SkipBack className="w-4 h-4 text-white/70" /></button>
                <button onClick={togglePlay} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}>
                  {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <button onClick={() => skip(30)} className="p-1.5 rounded-full hover:bg-white/10"><SkipForward className="w-4 h-4 text-white/70" /></button>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10"><X className="w-4 h-4 text-white/40" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "linear-gradient(160deg,#0d0820,#1a0838)" }}>
          <div className="flex items-center justify-between px-5 pt-12 pb-4">
            <button onClick={() => setExpanded(false)} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">En écoute</p>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
            <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-2xl" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.5)" }}>
              {episode.cover_url ? <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}><Radio className="w-20 h-20 text-white/60" /></div>}
            </div>
            <div className="text-center">
              <h2 className="font-bold text-xl text-white mb-1">{episode.title}</h2>
              <p className="text-sm text-white/50">{episode.channel_name}</p>
              {episode.serie && <p className="text-xs text-purple-400 mt-1">📚 {episode.serie} · Ép. {episode.episode_num}</p>}
            </div>
            <div className="w-full space-y-2">
              <input type="range" min={0} max={duration} value={current} onChange={seek}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right,#7C3AED ${pct}%,rgba(255,255,255,0.15) ${pct}%)` }} />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>{formatDuration(current)}</span><span>{formatDuration(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <button onClick={() => skip(-15)} className="flex flex-col items-center gap-1">
                <SkipBack className="w-6 h-6 text-white/60" /><span className="text-[9px] text-white/30">-15s</span>
              </button>
              <button onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow: "0 8px 32px rgba(124,58,237,0.6)" }}>
                {playing ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
              </button>
              <button onClick={() => skip(30)} className="flex flex-col items-center gap-1">
                <SkipForward className="w-6 h-6 text-white/60" /><span className="text-[9px] text-white/30">+30s</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EpisodeCard({ episode, onPlay, isPlaying }: { episode: Episode; onPlay: (ep: Episode) => void; isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{ background: isPlaying ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${isPlaying ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}` }}
      onClick={() => onPlay(episode)}>
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg,#7C3AED44,#4F46E544)" }}>
        {episode.cover_url ? <img src={episode.cover_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Radio className="w-5 h-5 text-purple-400" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{episode.title}</p>
        {episode.serie && <p className="text-[10px] text-purple-400">📚 {episode.serie} · Ép. {episode.episode_num}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/40">{formatDuration(episode.duration_sec)}</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{episode.plays} écoutes</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{timeAgo(episode.created_at)}</span>
        </div>
      </div>
      <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isPlaying ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : "rgba(255,255,255,0.08)" }}>
        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
    </div>
  );
}

function ChannelView({ channel, onBack, onPlay, currentEpisode }: {
  channel: Channel; onBack: () => void; onPlay: (ep: Episode) => void; currentEpisode: Episode | null;
}) {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(channel.is_subscribed || false);
  useEffect(() => {
    (supabase.from("podcast_episodes" as any).select("*").eq("channel_id", channel.id).eq("is_published", true).order("created_at", { ascending: false }) as any)
      .then(({ data }: any) => { setEpisodes((data || []).map((e: any) => ({ ...e, channel_name: channel.name }))); setLoading(false); });
  }, [channel.id]);
  const toggleSub = async () => {
    if (!user) return;
    if (subscribed) await (supabase.from("podcast_subscriptions" as any).delete().eq("user_id", user.id).eq("channel_id", channel.id) as any);
    else await (supabase.from("podcast_subscriptions" as any).insert({ user_id: user.id, channel_id: channel.id }) as any);
    setSubscribed(!subscribed);
  };
  const c = CAT[channel.category] || CAT.autre;
  return (
    <div className="min-h-screen pb-32" style={{ background: "linear-gradient(160deg,#0d0820,#1a0838,#0d0820)" }}>
      <div className="relative">
        <div className="h-36 w-full" style={{ background: `linear-gradient(135deg,${c.color}44,#7C3AED44)` }}>
          {channel.cover_url && <img src={channel.cover_url} alt="" className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 40%,#0d0820 100%)" }} />
        </div>
        <button onClick={onBack} className="absolute top-4 left-4 p-2 rounded-full" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="px-5 pb-4 -mt-8">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-xl text-white truncate">{channel.name}</h2>
                {channel.is_verified && <Check className="w-4 h-4 text-blue-400" />}
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: c.color + "33", color: c.color }}>{c.emoji} {c.label}</span>
            </div>
            {user && (
              <button onClick={toggleSub} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                style={subscribed ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" } : { background: "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#fff" }}>
                {subscribed ? <><BellOff className="w-3.5 h-3.5" />Abonné</> : <><Bell className="w-3.5 h-3.5" />S'abonner</>}
              </button>
            )}
          </div>
          {channel.description && <p className="text-xs text-white/50 mt-2">{channel.description}</p>}
        </div>
      </div>
      <div className="px-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Épisodes</p>
        {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          : episodes.length === 0 ? <div className="flex flex-col items-center py-12 text-center"><Radio className="w-10 h-10 text-white/20 mb-3" /><p className="text-sm text-white/50">Aucun épisode pour l'instant</p></div>
          : <div className="space-y-2">{episodes.map(ep => <EpisodeCard key={ep.id} episode={ep} isPlaying={currentEpisode?.id === ep.id} onPlay={onPlay} />)}</div>}
      </div>
    </div>
  );
}

function CreatorRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form"|"success">("form");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ full_name:"", ministry:"", creator_type:"pasteur", description:"", contact:"" });
  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSubmit = async () => {
    if (!form.full_name||!form.ministry||!form.description||!form.contact) return;
    if (!user) { setErrorMsg("Vous devez être connecté."); return; }
    setSending(true); setErrorMsg("");
    try {
      const { data: ex } = await (supabase.from("podcast_creator_requests" as any).select("id,status").eq("user_id", user.id).maybeSingle() as any);
      if (ex) { setErrorMsg((ex as any).status==="pending"?"Demande déjà en attente ⏳":"Tu as déjà fait une demande"); setSending(false); return; }
      const { error } = await (supabase.from("podcast_creator_requests" as any).insert({ user_id:user.id, email:user.email||"", full_name:form.full_name, ministry:form.ministry, creator_type:form.creator_type, description:form.description, contact:form.contact, status:"pending" }) as any);
      if (error) throw error;
      setStep("success"); onSuccess();
    } catch { setErrorMsg("Erreur lors de l'envoi."); } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => !sending && onClose()}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto" style={{ maxHeight:"90vh", background:"rgba(15,8,40,0.97)", border:"1px solid rgba(139,92,246,0.3)", borderBottom:"none" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
        {step==="success" ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.4)" }}><Check className="w-8 h-8 text-purple-400" /></div>
            <h3 className="font-bold text-xl text-white mb-2">Demande envoyée !</h3>
            <p className="text-sm text-white/60">L'équipe MIREC te contactera sous 48–72h.</p>
            <button onClick={onClose} className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white" style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)" }}>Fermer</button>
          </div>
        ) : (
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between py-4 border-b mb-5" style={{ borderColor:"rgba(139,92,246,0.2)" }}>
              <div><h3 className="font-bold text-lg text-white">Devenir créateur</h3><p className="text-xs text-white/50 mt-0.5">Remplis ce formulaire pour demander l'accès</p></div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><X className="w-4 h-4 text-white/60" /></button>
            </div>
            <div className="space-y-4">
              {[{key:"full_name",label:"Nom complet *",ph:"Pasteur Jean..."},{key:"ministry",label:"Ministère *",ph:"Radio Lumière…"},{key:"contact",label:"Contact *",ph:"+229 96 00 00 00"}].map(f => (
                <div key={f.key}><label className="text-xs font-semibold text-white/70 mb-1 block">{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={field(f.key as keyof typeof form)} placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(139,92,246,0.25)" }} /></div>
              ))}
              <div><label className="text-xs font-semibold text-white/70 mb-1 block">Type de contenu</label>
                <select value={form.creator_type} onChange={field("creator_type")} className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(139,92,246,0.25)" }}>
                  <option value="pasteur">⛪ Pasteur</option><option value="radio">📻 Radio</option><option value="enseignant">📖 Enseignant</option><option value="evangeliste">📣 Évangéliste</option><option value="autre">✨ Autre</option>
                </select></div>
              <div><label className="text-xs font-semibold text-white/70 mb-1 block">Description *</label>
                <textarea value={form.description} onChange={field("description")} placeholder="Décris ton ministère…" rows={4} className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(139,92,246,0.25)" }} /></div>
              {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}
              <button onClick={handleSubmit} disabled={sending||!form.full_name||!form.ministry||!form.description||!form.contact}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow:"0 4px 20px rgba(124,58,237,0.4)" }}>
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Envoyer ma demande <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Podcast() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover"|"subscriptions">("discover");
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (supabase.from("podcast_creator_requests" as any).select("status").eq("user_id", user.id).maybeSingle() as any)
      .then(({ data }: any) => { if (data) setRequestStatus((data as any).status); });
  }, [user]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    // ── Requête SANS filtre admin — accessible à TOUS ──
    const { data, error } = await (supabase.from("podcast_channels" as any).select("*").order("created_at", { ascending: false }) as any);
    if (error) { console.error("podcast_channels:", error.message); setLoading(false); return; }
    const enriched = await Promise.all((data || []).map(async (ch: any) => {
      const [epR, subR, myR] = await Promise.all([
        (supabase.from("podcast_episodes" as any).select("id", { count:"exact", head:true }).eq("channel_id", ch.id) as any),
        (supabase.from("podcast_subscriptions" as any).select("id", { count:"exact", head:true }).eq("channel_id", ch.id) as any),
        user ? (supabase.from("podcast_subscriptions" as any).select("id").eq("channel_id", ch.id).eq("user_id", user.id).maybeSingle() as any) : Promise.resolve({ data: null }),
      ]);
      return { ...ch, episode_count: epR.count||0, subscriber_count: subR.count||0, is_subscribed: !!myR.data };
    }));
    setChannels(enriched); setLoading(false);
  }, [user]);

  const fetchRecent = useCallback(async () => {
    const { data } = await (supabase.from("podcast_episodes" as any).select("*, podcast_channels(name)").eq("is_published", true).order("created_at", { ascending: false }).limit(6) as any);
    if (data) setRecentEpisodes((data as any[]).map((e: any) => ({ ...e, channel_name: e.podcast_channels?.name||"" })));
  }, []);

  useEffect(() => { fetchChannels(); fetchRecent(); }, [fetchChannels, fetchRecent]);

  const mySubs = channels.filter(c => c.is_subscribed);
  const cat = (k: string) => CAT[k] || CAT.autre;

  if (selectedChannel) return (
    <>
      <ChannelView channel={selectedChannel} onBack={() => setSelectedChannel(null)} onPlay={setCurrentEpisode} currentEpisode={currentEpisode} />
      {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
    </>
  );

  return (
    <div className="min-h-screen pb-36" style={{ background:"linear-gradient(160deg,#0d0820,#1a0838,#0d0820)" }}>
      <div className="sticky top-0 z-30 px-4 py-3" style={{ background:"rgba(13,8,32,0.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(139,92,246,0.15)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <div><h1 className="font-bold text-base text-white leading-none">Podcast MIREC</h1><p className="text-[10px] text-white/40">Enseignements & Prédications</p></div>
          </div>
          {user && (requestStatus==="pending" ? (
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-yellow-300" style={{ background:"rgba(217,119,6,0.2)", border:"1px solid rgba(217,119,6,0.3)" }}>⏳ En attente</div>
          ) : requestStatus==="approved" ? (
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-green-300" style={{ background:"rgba(5,150,105,0.2)", border:"1px solid rgba(5,150,105,0.3)" }}>✅ Créateur</div>
          ) : (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow:"0 2px 8px rgba(124,58,237,0.4)" }}>
              <Mic2 className="w-3.5 h-3.5" /> Créateur
            </button>
          ))}
        </div>
        <div className="max-w-lg mx-auto flex gap-1 mt-2">
          {[{key:"discover",label:"Découvrir"},{key:"subscriptions",label:`Mes abonnements${mySubs.length>0?` (${mySubs.length})`:""}`}].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab===tab.key?"text-white":"text-white/40 bg-white/5"}`}
              style={activeTab===tab.key?{background:"linear-gradient(135deg,#7C3AED44,#4F46E544)",border:"1px solid rgba(124,58,237,0.4)"}:{}}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {activeTab==="discover" && <>
          {recentEpisodes.length>0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Récemment ajoutés</p>
              <div className="space-y-2">{recentEpisodes.map(ep => <EpisodeCard key={ep.id} episode={ep} isPlaying={currentEpisode?.id===ep.id} onPlay={setCurrentEpisode} />)}</div>
            </div>
          )}
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Canaux disponibles</p>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : channels.length===0 ? (
            <div className="flex flex-col items-center py-16 text-center px-4">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5" style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)" }}><Radio className="w-12 h-12 text-purple-400" /></div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full mb-4" style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)" }}>
                <Lock className="w-3 h-3 text-purple-400" /><span className="text-[11px] font-semibold text-purple-300">Bientôt disponible</span>
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Aucun canal pour l'instant</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">Les enseignements et prédications arrivent bientôt sur MIREC.</p>
              {user && !requestStatus && (
                <button onClick={() => setShowForm(true)} className="px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2"
                  style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow:"0 4px 20px rgba(124,58,237,0.4)" }}>
                  <Mic2 className="w-4 h-4" /> Devenir le premier créateur
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch: any) => {
                const c = cat(ch.category);
                return (
                  <button key={ch.id} onClick={() => setSelectedChannel(ch)} className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                    style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(139,92,246,0.2)" }}>
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background:`linear-gradient(135deg,${c.color}44,#7C3AED44)` }}>
                        {ch.cover_url ? <img src={ch.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-2xl">{c.emoji}</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="font-bold text-sm text-white truncate">{ch.name}</p>
                          {ch.is_verified && <Check className="w-3.5 h-3.5 text-blue-400" />}
                          {ch.is_live && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background:"rgba(220,38,38,0.8)" }}><div className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE</span>}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background:c.color+"22", color:c.color }}>{c.emoji} {c.label}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/40">{ch.episode_count} épisodes</span>
                          <span className="text-[10px] text-white/40">{ch.subscriber_count} abonnés</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>}

        {activeTab==="subscriptions" && (
          !user ? (
            <div className="flex flex-col items-center py-16 text-center"><Bell className="w-12 h-12 text-white/20 mb-3" /><p className="font-semibold text-white text-sm">Connecte-toi pour voir tes abonnements</p></div>
          ) : mySubs.length===0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="w-12 h-12 text-white/20 mb-3" />
              <p className="font-semibold text-white text-sm">Aucun abonnement</p>
              <p className="text-xs text-white/40 mt-1">Abonne-toi à des canaux pour les retrouver ici</p>
              <button onClick={() => setActiveTab("discover")} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)" }}>Découvrir</button>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubs.map((ch: any) => { const c=cat(ch.category); return (
                <button key={ch.id} onClick={() => setSelectedChannel(ch)} className="w-full text-left rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(139,92,246,0.3)" }}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background:`linear-gradient(135deg,${c.color}44,#7C3AED44)` }}>
                      {ch.cover_url?<img src={ch.cover_url} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><span className="text-xl">{c.emoji}</span></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5"><p className="font-bold text-sm text-white truncate">{ch.name}</p>{ch.is_verified&&<Check className="w-3.5 h-3.5 text-blue-400"/>}</div>
                      <p className="text-[10px] text-white/40">{ch.episode_count} épisodes</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30"/>
                  </div>
                </button>
              );})}
            </div>
          )
        )}
      </div>

      {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
      {showForm && <CreatorRequestModal onClose={() => setShowForm(false)} onSuccess={() => setRequestStatus("pending")} />}
    </div>
  );
}
