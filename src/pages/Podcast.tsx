// src/pages/Podcast.tsx (version corrigée)
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Radio, Bell, Mic2, ChevronRight, Check, Play, Pause } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import ChannelView from "./ChannelView";
import CreatorDashboard from "./CreatorDashboard";

// Catégories (inchangé)
const CATEGORY_CONFIG = {
  enseignement: { label: "Enseignement", emoji: "📖", color: "#1A4B9B" },
  predication:  { label: "Prédication",  emoji: "⛪", color: "#7C3AED" },
  radio:        { label: "Radio",        emoji: "📻", color: "#059669" },
  jeunesse:     { label: "Jeunesse",     emoji: "🔥", color: "#D97706" },
  autre:        { label: "Autre",        emoji: "✨", color: "#6B7280" },
};

export default function Podcast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [showCreatorDashboard, setShowCreatorDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "subscriptions">("discover");
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (!user) return;
    supabase.from("admins").select("user_id").eq("user_id", user.id).single()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Vérifier si l'utilisateur est créateur actif
  const [isCreator, setIsCreator] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("podcast_channels").select("id").eq("creator_id", user.id).single()
      .then(({ data }) => setIsCreator(!!data));
  }, [user]);

  // Charger les canaux (exemple simplifié, tu peux garder ta version complète)
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("podcast_channels").select("*").eq("is_banned", false).order("created_at", { ascending: false });
    if (data) setChannels(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  if (selectedChannel) {
    return (
      <>
        <ChannelView channel={selectedChannel} onBack={() => setSelectedChannel(null)} onPlay={setCurrentEpisode} currentEpisode={currentEpisode} />
        {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
      </>
    );
  }

  if (showCreatorDashboard) {
    return <CreatorDashboard onClose={() => setShowCreatorDashboard(false)} />;
  }

  const mySubscriptions = channels.filter(c => c.is_subscribed);

  return (
    <div className="min-h-screen pb-36" style={{ background: "linear-gradient(160deg, #0d0820, #1a0838)" }}>
      {/* Header avec boutons */}
      <div className="sticky top-0 z-30 px-4 py-3 backdrop-blur-md border-b border-purple-500/20 bg-black/50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <div>
              <h1 className="font-bold text-base text-white">Podcast MIREC</h1>
              <p className="text-[10px] text-white/40">Enseignements & Prédications</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isCreator && (
              <button onClick={() => setShowCreatorDashboard(true)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-600 text-white">
                <Mic2 className="w-3.5 h-3.5 inline mr-1" /> Espace créateur
              </button>
            )}
            {isAdmin && (
              <button onClick={() => navigate("/admin")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                Admin
              </button>
            )}
          </div>
        </div>

        {/* Onglets Découvrir / Abonnements */}
        <div className="max-w-lg mx-auto flex gap-1 mt-2">
          <button onClick={() => setActiveTab("discover")} className={`flex-1 py-2 rounded-xl text-xs font-semibold ${activeTab === "discover" ? "bg-purple-500/30 text-white border border-purple-500" : "text-white/40 bg-white/5"}`}>Découvrir</button>
          <button onClick={() => setActiveTab("subscriptions")} className={`flex-1 py-2 rounded-xl text-xs font-semibold ${activeTab === "subscriptions" ? "bg-purple-500/30 text-white border border-purple-500" : "text-white/40 bg-white/5"}`}>Mes abonnements ({mySubscriptions.length})</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {activeTab === "discover" && (
          // Ton contenu découverte (épisodes récents, liste des canaux…)
          <div>Contenu découverte – à compléter avec ton code existant</div>
        )}
        {activeTab === "subscriptions" && (
          <div>Mes abonnements – à compléter</div>
        )}
      </div>

      {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
    </div>
  );
}
