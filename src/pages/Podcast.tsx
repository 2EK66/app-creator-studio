import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ← AJOUT
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, ChevronRight, Check, X,
  Play, Pause, ArrowLeft, SkipBack, SkipForward,
  Bell, BellOff, Lock
} from "lucide-react";

// ... (toutes les interfaces, fonctions formatDuration, timeAgo, CAT, AudioPlayer, EpisodeCard, ChannelView, CreatorRequestModal restent identiques)

export default function Podcast() {
  const { user } = useAuth();
  const navigate = useNavigate(); // ← AJOUT
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover"|"subscriptions">("discover");
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // ← AJOUT

  // Vérifier si l'utilisateur est admin (table profiles)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [user]);

  // ... (le reste du code : useEffect pour requestStatus, fetchChannels, fetchRecent, etc. est inchangé)

  // (tout le code jusqu'au return est identique)

  return (
    <div className="min-h-screen pb-36" style={{ background:"linear-gradient(160deg,#0d0820,#1a0838,#0d0820)" }}>
      <div className="sticky top-0 z-30 px-4 py-3" style={{ background:"rgba(13,8,32,0.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(139,92,246,0.15)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <div><h1 className="font-bold text-base text-white leading-none">Podcast MIREC</h1><p className="text-[10px] text-white/40">Enseignements & Prédications</p></div>
          </div>
          <div className="flex items-center gap-2">
            {/* BOUTON ADMIN (visible seulement si admin) */}
            {isAdmin && (
              <button 
                onClick={() => navigate("/admin")}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white"
              >
                Admin
              </button>
            )}
            {/* Bouton Créateur existant */}
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
        </div>
        {/* ... le reste (onglets, contenu) est inchangé ... */}
      </div>
      {/* ... (reste du JSX) ... */}
    </div>
  );
}
