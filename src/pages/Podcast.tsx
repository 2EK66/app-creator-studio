import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Radio, Bell, Mic2, ChevronRight, Check, Play, Pause } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import ChannelView from "./ChannelView";
import CreatorDashboard from "./CreatorDashboard";
import AdminRequests from "./AdminRequests";
import { Channel, Episode } from "@/types/podcast";

// Catégories (inchangé)
const CATEGORY_CONFIG = { ... };

export default function Podcast() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showCreatorDashboard, setShowCreatorDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "subscriptions">("discover");

  // Vérifier si l'utilisateur est admin (à définir selon ta logique)
  const isAdmin = user?.email === "admin@mirec.org"; // exemple

  // Vérifier si l'utilisateur est créateur actif
  const [isCreator, setIsCreator] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("podcast_channels").select("id").eq("creator_id", user.id).single()
      .then(({ data }) => setIsCreator(!!data));
  }, [user]);

  // Charger les canaux (comme avant)
  const fetchChannels = useCallback(async () => { ... }, [user]);

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

  if (showAdminPanel && isAdmin) {
    return <AdminRequests onClose={() => setShowAdminPanel(false)} />;
  }

  const mySubscriptions = channels.filter(c => c.is_subscribed);

  return (
    <div className="min-h-screen pb-36" style={{ background: "linear-gradient(160deg, #0d0820, #1a0838)" }}>
      {/* Header avec boutons créateur/admin */}
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
              <button onClick={() => setShowAdminPanel(true)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white">
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
        {/* Contenu des onglets – inchangé par rapport à ton code, mais adapte les imports */}
        {activeTab === "discover" && ( /* ... */ )}
        {activeTab === "subscriptions" && ( /* ... */ )}
      </div>

      {currentEpisode && <AudioPlayer episode={currentEpisode} onClose={() => setCurrentEpisode(null)} />}
    </div>
  );
}
