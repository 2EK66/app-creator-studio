import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Video, Eye, Users, Clock, UploadCloud, Bell, Play } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function CreatorDashboard({ onClose }) {
  const { user } = useAuth();

  const [channel, setChannel] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    series_id: "",
    audioFile: null
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      const { data: channelData } = await supabase
        .from("podcast_channels")
        .select("*")
        .eq("creator_id", user.id)
        .maybeSingle();

      setChannel(channelData);

      if (!channelData) return setLoading(false);

      const { data: eps } = await supabase
        .from("podcast_episodes")
        .select("*")
        .eq("channel_id", channelData.id);

      setEpisodes(eps || []);

      // fake notifications
      setNotifications([
        "Nouveau follower 🎉",
        "Ton épisode performe bien 🚀",
        "Tu as gagné 10 abonnés"
      ]);

      setLoading(false);
    };

    loadData();
  }, [user]);

  const handleUpload = async () => {
    if (!form.audioFile || !channel) return;
    setUploading(true);

    const fileName = `${Date.now()}.${form.audioFile.name.split(".").pop()}`;

    await supabase.storage
      .from("podcast-audio")
      .upload(`episodes/${fileName}`, form.audioFile);

    const { data } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(`episodes/${fileName}`);

    await supabase.from("podcast_episodes").insert({
      channel_id: channel.id,
      title: form.title,
      description: form.description,
      audio_url: data.publicUrl,
      is_published: true,
    });

    setUploading(false);
    alert("Publié 🚀");
  };

  if (loading) return <div className="text-white p-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0820] to-[#1a0838] text-white">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={onClose}><ArrowLeft /></button>
        <h1 className="font-bold text-lg">{channel?.name}</h1>
      </div>

      <div className="p-4 space-y-6 max-w-5xl mx-auto">

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white/5 p-4 rounded-2xl">
            <Eye />
            <p className="text-xl font-bold">{episodes.length}</p>
            <p className="text-xs text-white/50">Épisodes</p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl">
            <Users />
            <p className="text-xl font-bold">{channel?.subscriber_count || 0}</p>
            <p className="text-xs text-white/50">Abonnés</p>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl">
            <Clock />
            <p className="text-xl font-bold">{episodes.reduce((a,b)=>a+(b.plays||0),0)}</p>
            <p className="text-xs text-white/50">Écoutes</p>
          </div>
        </div>

        {/* GRAPH */}
        <div className="bg-white/5 p-4 rounded-2xl">
          <h2 className="mb-2">Statistiques</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={episodes.map((e,i)=>({name:`Ep ${i+1}`, views:e.plays||0}))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* NOTIFICATIONS */}
        <div className="bg-white/5 p-4 rounded-2xl">
          <h2 className="flex items-center gap-2"><Bell /> Notifications</h2>
          {notifications.map((n,i)=>(
            <p key={i} className="text-sm text-white/70">• {n}</p>
          ))}
        </div>

        {/* PLAYER */}
        {selectedAudio && (
          <div className="bg-black/40 p-4 rounded-2xl">
            <h2>Lecture en cours</h2>
            <audio controls src={selectedAudio} className="w-full" />
          </div>
        )}

        {/* UPLOAD */}
        <div className="bg-white/5 p-4 rounded-2xl space-y-2">
          <h2 className="flex gap-2 items-center"><UploadCloud /> Publier</h2>
          <input placeholder="Titre" className="w-full p-2 rounded bg-black/40"
            onChange={(e)=>setForm({...form,title:e.target.value})}/>
          <textarea placeholder="Description" className="w-full p-2 rounded bg-black/40"
            onChange={(e)=>setForm({...form,description:e.target.value})}/>
          <input type="file" accept="audio/*"
            onChange={(e)=>setForm({...form,audioFile:e.target.files?.[0]})}/>
          <button onClick={handleUpload} className="bg-purple-600 w-full py-2 rounded">
            {uploading ? "Upload..." : "Publier"}
          </button>
        </div>

        {/* EPISODES */}
        <div className="space-y-3">
          <h2>Mes épisodes</h2>
          {episodes.map(ep => (
            <motion.div key={ep.id} whileHover={{scale:1.02}}
              className="bg-white/5 p-3 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold">{ep.title}</p>
                <p className="text-xs text-white/50">{ep.description}</p>
              </div>
              <button onClick={()=>setSelectedAudio(ep.audio_url)}>
                <Play />
              </button>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
