import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Plus, Video, Eye, Users, Clock } from "lucide-react";

export default function CreatorDashboard({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", series_id: "", audioFile: null, coverFile: null });

  useEffect(() => {
    if (!user) return;
    supabase.from("podcast_channels").select("*").eq("creator_id", user.id).single().then(({ data }) => {
      setChannel(data);
      if (data) {
        supabase.from("podcast_episodes").select("*, series:series_id(*)").eq("channel_id", data.id).then(({ data: eps }) => setEpisodes(eps || []));
        supabase.from("podcast_series").select("*").eq("channel_id", data.id).then(({ data: series }) => setSeriesList(series || []));
      }
    });
  }, [user]);

  const handleUpload = async () => {
    if (!form.audioFile || !channel) return;
    setUploading(true);
    const fileExt = form.audioFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from("podcast-audio").upload(`episodes/${fileName}`, form.audioFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("podcast-audio").getPublicUrl(`episodes/${fileName}`);
    await supabase.from("podcast_episodes").insert({
      channel_id: channel.id,
      title: form.title,
      description: form.description,
      audio_url: publicUrl,
      series_id: form.series_id || null,
      is_published: true,
      duration_sec: 0, // à calculer côté client
    });
    setUploading(false);
    alert("Épisode publié !");
    // recharger
  };

  const startLive = async () => {
    // Appel à une Edge Function Mux (à créer)
    const res = await fetch("/api/create-live", { method: "POST", body: JSON.stringify({ channelId: channel.id }) });
    const { streamKey } = await res.json();
    alert(`Clé de stream : ${streamKey}. Utilise OBS avec cette clé.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0820] to-[#1a0838] pb-20">
      <div className="sticky top-0 p-4 flex items-center gap-3 backdrop-blur-md bg-black/50">
        <button onClick={onClose}><ArrowLeft className="text-white" /></button>
        <h1 className="text-white font-bold">Espace créateur – {channel?.name}</h1>
      </div>
      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 p-3 rounded-xl"><Eye className="text-purple-400" /><p className="text-white font-bold">{episodes.reduce((a,b)=>a+b.plays,0)}</p><p className="text-xs text-white/40">Écoutes</p></div>
          <div className="bg-white/5 p-3 rounded-xl"><Users className="text-purple-400" /><p className="text-white font-bold">{channel.subscriber_count}</p><p className="text-xs text-white/40">Abonnés</p></div>
          <div className="bg-white/5 p-3 rounded-xl"><Clock className="text-purple-400" /><p className="text-white font-bold">{episodes.length}</p><p className="text-xs text-white/40">Épisodes</p></div>
        </div>

        {/* Upload épisode */}
        <div className="bg-white/5 p-4 rounded-2xl">
          <h2 className="text-white font-semibold mb-3">Publier un épisode</h2>
          <input type="text" placeholder="Titre" className="w-full p-2 rounded bg-black/50 text-white mb-2" onChange={e => setForm({...form, title: e.target.value})} />
          <textarea placeholder="Description" className="w-full p-2 rounded bg-black/50 text-white mb-2" rows={3} onChange={e => setForm({...form, description: e.target.value})} />
          <select className="w-full p-2 rounded bg-black/50 text-white mb-2" onChange={e => setForm({...form, series_id: e.target.value})}>
            <option value="">Sans série</option>
            {seriesList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <input type="file" accept="audio/*" className="text-white mb-2" onChange={e => setForm({...form, audioFile: e.target.files?.[0] || null})} />
          <button onClick={handleUpload} disabled={uploading} className="bg-purple-600 px-4 py-2 rounded text-white w-full">Publier</button>
        </div>

        {/* Gestion live */}
        <div className="bg-white/5 p-4 rounded-2xl">
          <h2 className="text-white font-semibold mb-3">Lancer un live</h2>
          <button onClick={startLive} className="bg-red-600 px-4 py-2 rounded text-white w-full"><Video className="inline mr-2" /> Démarrer un live</button>
        </div>
      </div>
    </div>
  );
}
