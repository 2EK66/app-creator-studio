import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, Check, X, UserX, Ban, Radio, Eye, 
  Shield, AlertTriangle, RefreshCw, Search 
} from "lucide-react";

interface CreatorRequest {
  id: string;
  full_name: string;
  ministry: string;
  creator_type: string;
  description: string;
  contact: string;
  email: string;
  status: string;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  category: string;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  creator_id: string;
  episode_count?: number;
  subscriber_count?: number;
  created_at: string;
  creator_email?: string;
  creator_name?: string;
}

interface BannedUser {
  user_id: string;
  email: string;
  full_name: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string;
  role: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "channels" | "users">("requests");
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Vérifier si l'utilisateur est admin
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === "admin") setIsAdmin(true);
        else onClose(); // pas admin, fermer
      });
  }, [user]);

  // Charger les demandes en attente
  const fetchRequests = async () => {
    const { data } = await supabase
      .from("podcast_creator_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  // Charger toutes les chaînes (avec infos créateur)
  const fetchChannels = async () => {
    const { data: channelsData } = await supabase
      .from("podcast_channels")
      .select("*")
      .order("created_at", { ascending: false });
    if (!channelsData) return;
    
    // Enrichir avec le nom/email du créateur
    const enriched = await Promise.all(channelsData.map(async (ch) => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", ch.creator_id)
        .single();
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(ch.creator_id);
      return {
        ...ch,
        creator_name: profile?.full_name || "Inconnu",
        creator_email: authUser?.email || "",
      };
    }));
    setChannels(enriched);
  };

  // Charger les utilisateurs bannis ou tous les utilisateurs avec rôle
  const fetchUsers = async () => {
    // Récupérer les profils avec is_banned = true
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("*, auth.users!inner(email)")
      .eq("is_banned", true);
    if (profiles) setBannedUsers(profiles as any);
  };

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchRequests(), fetchChannels(), fetchUsers()]).finally(() => setLoading(false));
  }, [isAdmin]);

  // Approuver une demande
  const approveRequest = async (req: CreatorRequest) => {
    // 1. Mettre à jour le statut
    await supabase.from("podcast_creator_requests").update({ status: "approved" }).eq("id", req.id);
    // 2. Créer le canal
    await supabase.from("podcast_channels").insert({
      creator_id: req.user_id,
      name: req.ministry,
      description: req.description,
      category: req.creator_type,
      is_verified: true,
      is_banned: false,
    });
    // 3. S'assurer que l'utilisateur a un profil avec rôle creator
    await supabase.from("user_profiles").upsert({
      user_id: req.user_id,
      role: "creator",
      is_banned: false,
    }, { onConflict: "user_id" });
    // 4. Recharger
    fetchRequests();
    fetchChannels();
  };

  const rejectRequest = async (req: CreatorRequest) => {
    await supabase.from("podcast_creator_requests").update({ status: "rejected" }).eq("id", req.id);
    fetchRequests();
  };

  // Bannir une chaîne
  const banChannel = async (channel: Channel, reason: string) => {
    await supabase
      .from("podcast_channels")
      .update({ is_banned: true, ban_reason: reason })
      .eq("id", channel.id);
    fetchChannels();
  };

  // Débannir une chaîne
  const unbanChannel = async (channel: Channel) => {
    await supabase
      .from("podcast_channels")
      .update({ is_banned: false, ban_reason: null })
      .eq("id", channel.id);
    fetchChannels();
  };

  // Bannir un utilisateur (et toutes ses chaînes)
  const banUser = async (userId: string, reason: string) => {
    // Bannir l'utilisateur
    await supabase
      .from("user_profiles")
      .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
      .eq("user_id", userId);
    // Bannir toutes ses chaînes
    await supabase
      .from("podcast_channels")
      .update({ is_banned: true, ban_reason: reason })
      .eq("creator_id", userId);
    fetchUsers();
    fetchChannels();
  };

  const unbanUser = async (userId: string) => {
    await supabase
      .from("user_profiles")
      .update({ is_banned: false, ban_reason: null, banned_at: null })
      .eq("user_id", userId);
    await supabase
      .from("podcast_channels")
      .update({ is_banned: false, ban_reason: null })
      .eq("creator_id", userId);
    fetchUsers();
    fetchChannels();
  };

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.creator_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={onClose} className="flex items-center gap-2 text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <h1 className="font-bold text-lg">Administration MIREC</h1>
        <div className="w-8" />
      </div>

      {/* Onglets */}
      <div className="flex border-b border-white/10 px-4">
        {[
          { id: "requests", label: "Demandes", icon: <Shield className="w-4 h-4" />, count: requests.length },
          { id: "channels", label: "Chaînes", icon: <Radio className="w-4 h-4" />, count: channels.length },
          { id: "users", label: "Utilisateurs bannis", icon: <Ban className="w-4 h-4" />, count: bannedUsers.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "border-b-2 border-purple-500 text-purple-400"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Onglet Demandes */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {loading && <div className="text-center py-10">Chargement...</div>}
            {!loading && requests.length === 0 && (
              <div className="text-center py-16 text-white/40">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucune demande en attente</p>
              </div>
            )}
            {requests.map(req => (
              <div key={req.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white">{req.full_name}</h3>
                    <p className="text-sm text-purple-400">{req.ministry}</p>
                    <p className="text-xs text-white/40 mt-1">{req.email} • {req.contact}</p>
                    <p className="text-sm text-white/60 mt-2">{req.description}</p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                        {req.creator_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveRequest(req)}
                      className="bg-green-600 hover:bg-green-500 p-2 rounded-xl transition"
                      title="Approuver"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rejectRequest(req)}
                      className="bg-red-600 hover:bg-red-500 p-2 rounded-xl transition"
                      title="Refuser"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Onglet Chaînes */}
        {activeTab === "channels" && (
          <div>
            <div className="mb-4 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Rechercher une chaîne ou un créateur..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder:text-white/40"
                />
              </div>
              <button onClick={fetchChannels} className="bg-white/10 p-2 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {filteredChannels.map(ch => (
                <div key={ch.id} className={`bg-white/5 rounded-2xl p-4 border ${ch.is_banned ? "border-red-500/50 bg-red-500/10" : "border-white/10"}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white">{ch.name}</h3>
                        {ch.is_verified && <Check className="w-4 h-4 text-blue-400" />}
                        {ch.is_banned && (
                          <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Banni
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Créateur: {ch.creator_name} ({ch.creator_email})
                      </p>
                      <p className="text-sm text-white/60 mt-2 line-clamp-2">{ch.description}</p>
                      <div className="flex gap-3 mt-2 text-xs text-white/40">
                        <span>{ch.category}</span>
                        <span>{ch.episode_count || 0} épisodes</span>
                        <span>{ch.subscriber_count || 0} abonnés</span>
                      </div>
                      {ch.ban_reason && (
                        <p className="text-xs text-red-400 mt-2">Motif: {ch.ban_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!ch.is_banned ? (
                        <button
                          onClick={() => {
                            const reason = prompt("Motif du bannissement de la chaîne:");
                            if (reason) banChannel(ch, reason);
                          }}
                          className="bg-red-600/80 hover:bg-red-600 p-2 rounded-xl transition"
                          title="Bannir cette chaîne"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => unbanChannel(ch)}
                          className="bg-green-600/80 hover:bg-green-600 p-2 rounded-xl transition"
                          title="Débannir"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Utilisateurs bannis */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {bannedUsers.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun utilisateur banni</p>
              </div>
            ) : (
              bannedUsers.map(prof => (
                <div key={prof.user_id} className="bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white">{prof.full_name || "Sans nom"}</h3>
                      <p className="text-sm text-white/50">{prof.email}</p>
                      <p className="text-xs text-red-400 mt-2">Banni depuis: {new Date(prof.banned_at).toLocaleDateString()}</p>
                      {prof.ban_reason && <p className="text-xs text-white/50 mt-1">Motif: {prof.ban_reason}</p>}
                    </div>
                    <button
                      onClick={() => unbanUser(prof.user_id)}
                      className="bg-green-600 p-2 rounded-xl"
                      title="Débannir l'utilisateur"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
