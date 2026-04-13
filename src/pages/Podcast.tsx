// AdminPanel.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, X, Ban, UserX, Trash2, RefreshCw, Users, Radio } from "lucide-react";

type Tab = "requests" | "users" | "channels";

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Vérifier que l'utilisateur est admin (redondant mais sécurisé)
  if (user?.email !== "admin@mirec.org") {
    return <div className="p-8 text-white">Accès refusé. Vous n'êtes pas administrateur.</div>;
  }

  // Charger les demandes en attente
  const fetchRequests = async () => {
    const { data } = await supabase
      .from("podcast_creator_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  // Charger les utilisateurs (depuis auth.users via une fonction sécurisée)
  // Note : récupérer les utilisateurs nécessite une Edge Function ou un accès service_role
  // Pour simplifier, on utilise une table user_profiles que tu auras créée.
  // Si tu n'as pas de table user_profiles, crée-la :
  // CREATE TABLE user_profiles (id UUID PRIMARY KEY, email TEXT, full_name TEXT, created_at TIMESTAMPTZ);
  const fetchUsers = async () => {
    const { data } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  };

  // Charger les chaînes (avec filtre is_banned)
  const fetchChannels = async () => {
    const { data } = await supabase
      .from("podcast_channels")
      .select("*, creator:creator_id(email, full_name)")
      .order("created_at", { ascending: false });
    setChannels(data || []);
  };

  useEffect(() => {
    fetchRequests();
    fetchUsers();
    fetchChannels();
  }, []);

  // Approuver une demande
  const approveRequest = async (req: any) => {
    await supabase.from("podcast_creator_requests").update({ status: "approved" }).eq("id", req.id);
    // Créer le canal
    await supabase.from("podcast_channels").insert({
      creator_id: req.user_id,
      name: req.ministry,
      description: req.description,
      category: req.creator_type,
      is_verified: true,
    });
    fetchRequests();
  };

  const rejectRequest = async (req: any) => {
    await supabase.from("podcast_creator_requests").update({ status: "rejected" }).eq("id", req.id);
    fetchRequests();
  };

  // Bannir un utilisateur (et ses chaînes)
  const banUser = async (userId: string, reason: string) => {
    if (!confirm("Bannir cet utilisateur ? Toutes ses chaînes seront aussi bannies.")) return;
    await supabase.from("banned_users").insert({ user_id: userId, reason, banned_by: user?.id });
    // Bannir toutes ses chaînes
    await supabase.from("podcast_channels").update({ is_banned: true, ban_reason: reason }).eq("creator_id", userId);
    fetchUsers();
    fetchChannels();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from("banned_users").delete().eq("user_id", userId);
    await supabase.from("podcast_channels").update({ is_banned: false, ban_reason: null }).eq("creator_id", userId);
    fetchUsers();
    fetchChannels();
  };

  // Bannir une chaîne spécifique
  const banChannel = async (channelId: string, reason: string) => {
    await supabase.from("podcast_channels").update({ is_banned: true, ban_reason: reason }).eq("id", channelId);
    fetchChannels();
  };

  const unbanChannel = async (channelId: string) => {
    await supabase.from("podcast_channels").update({ is_banned: false, ban_reason: null }).eq("id", channelId);
    fetchChannels();
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md p-4 flex items-center gap-3 border-b border-white/10">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl">Administration MIREC</h1>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-white/10">
        {[
          { id: "requests", label: "Demandes", icon: <Users className="w-4 h-4" /> },
          { id: "users", label: "Utilisateurs", icon: <UserX className="w-4 h-4" /> },
          { id: "channels", label: "Chaînes", icon: <Radio className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "border-b-2 border-purple-500 text-purple-400"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Onglet Demandes */}
        {activeTab === "requests" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Demandes d'accès créateur</h2>
            {requests.length === 0 ? (
              <p className="text-white/50 text-center py-8">Aucune demande en attente.</p>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="font-bold">{req.full_name}</p>
                    <p className="text-sm text-purple-300">{req.ministry}</p>
                    <p className="text-xs text-white/50 mt-1">{req.description}</p>
                    <p className="text-xs text-white/30 mt-2">Contact : {req.contact}</p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => approveRequest(req)}
                        className="flex-1 bg-green-600 py-2 rounded-xl flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Approuver
                      </button>
                      <button
                        onClick={() => rejectRequest(req)}
                        className="flex-1 bg-red-600/50 py-2 rounded-xl flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === "users" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Gestion des utilisateurs</h2>
            {users.length === 0 ? (
              <p className="text-white/50 text-center py-8">Aucun utilisateur trouvé.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const isBanned = u.is_banned; // à adapter si tu as un champ
                  return (
                    <div key={u.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{u.full_name || u.email}</p>
                        <p className="text-xs text-white/50">{u.email}</p>
                        {u.is_banned && <span className="text-xs text-red-400">⚠️ Banni</span>}
                      </div>
                      {isBanned ? (
                        <button onClick={() => unbanUser(u.id)} className="bg-green-600 px-3 py-1 rounded-full text-sm">
                          Débannir
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reason = prompt("Motif du bannissement :");
                            if (reason) banUser(u.id, reason);
                          }}
                          className="bg-red-600 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" /> Bannir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Onglet Chaînes */}
        {activeTab === "channels" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Chaînes podcast</h2>
            {channels.length === 0 ? (
              <p className="text-white/50 text-center py-8">Aucune chaîne.</p>
            ) : (
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div key={ch.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{ch.name}</p>
                        <p className="text-xs text-white/50">Créateur : {ch.creator?.email || ch.creator_id}</p>
                        {ch.is_banned && <p className="text-xs text-red-400">🔴 Banni – {ch.ban_reason}</p>}
                      </div>
                      {ch.is_banned ? (
                        <button onClick={() => unbanChannel(ch.id)} className="bg-green-600 px-3 py-1 rounded-full text-sm">
                          Réactiver
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reason = prompt("Motif du bannissement de la chaîne :");
                            if (reason) banChannel(ch.id, reason);
                          }}
                          className="bg-orange-600 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" /> Suspendre
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
