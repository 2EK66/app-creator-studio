import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Check, X, Ban, Radio,
  Shield, RefreshCw, Search, Users, Clock,
  AlertTriangle, ChevronRight
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface CreatorRequest {
  id: string;
  user_id: string;
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
  description: string | null;
  category: string;
  is_verified: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  creator_id: string;
  created_at: string;
  creator_name?: string;
  creator_email?: string;
  episode_count?: number;
}

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)  return `il y a ${Math.floor(d / 60)}min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`;
  return `il y a ${Math.floor(d / 86400)}j`;
}

const CREATOR_TYPE_LABEL: Record<string, string> = {
  pasteur:    "⛪ Pasteur",
  radio:      "📻 Radio",
  enseignant: "📖 Enseignant",
  evangeliste:"📣 Évangéliste",
  autre:      "✨ Autre",
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin]       = useState(false);
  const [checking, setChecking]     = useState(true);
  const [loading, setLoading]       = useState(true);
  const [requests, setRequests]     = useState<CreatorRequest[]>([]);
  const [channels, setChannels]     = useState<Channel[]>([]);
  const [activeTab, setActiveTab]   = useState<"requests" | "channels">("requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // ============================================================
  // VÉRIFICATION ADMIN — via profiles.id (PAS user_profiles)
  // ============================================================
  useEffect(() => {
    if (!user) { setChecking(false); return; }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)   // ← clé : "id" dans profiles = auth.uid()
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Erreur vérif admin:", error.message);
        if (data?.role === "admin") {
          setIsAdmin(true);
        } else {
          console.warn("Rôle:", data?.role, "— accès refusé");
        }
        setChecking(false);
      });
  }, [user]);

  // ============================================================
  // CHARGER LES DEMANDES
  // ============================================================
  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("podcast_creator_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { console.error("Demandes:", error.message); return; }
    setRequests(data || []);
  }, []);

  // ============================================================
  // CHARGER LES CANAUX
  // ============================================================
  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase
      .from("podcast_channels" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { console.error("Canaux:", error.message); return; }

    // Enrichir avec le nom du créateur depuis profiles
    const enriched = await Promise.all(
      (data || []).map(async (ch: any) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", ch.creator_id)   // ← "id" dans profiles
          .maybeSingle();

        const { count } = await supabase
          .from("podcast_episodes" as any)
          .select("id", { count: "exact", head: true })
          .eq("channel_id", ch.id) as any;

        return {
          ...ch,
          creator_name:  profile?.full_name || "Inconnu",
          episode_count: count || 0,
        };
      })
    );
    setChannels(enriched);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchRequests(), fetchChannels()])
      .finally(() => setLoading(false));
  }, [isAdmin, fetchRequests, fetchChannels]);

  // ============================================================
  // APPROUVER
  // ============================================================
  const approveRequest = async (req: CreatorRequest) => {
    if (!confirm(`Approuver la demande de ${req.full_name} ?`)) return;
    setProcessing(req.id);
    try {
      // Vérifier si canal déjà créé
      const { data: existing } = await supabase
        .from("podcast_channels" as any)
        .select("id").eq("creator_id", req.user_id).maybeSingle() as any;

      if (existing) {
        alert("Ce créateur a déjà un canal.");
        setProcessing(null); return;
      }

      // Mettre à jour la demande
      await supabase.from("podcast_creator_requests" as any)
        .update({ status: "approved" }).eq("id", req.id);

      // Créer le canal
      const { error: insertErr } = await supabase
        .from("podcast_channels" as any).insert({
          creator_id:  req.user_id,
          name:        req.ministry,
          description: req.description,
          category:    req.creator_type || "autre",
          is_verified: true,
        }) as any;

      if (insertErr) throw insertErr;

      // Mettre à jour le rôle créateur dans profiles
      await supabase.from("profiles")
        .update({ role: "creator" })
        .eq("id", req.user_id);

      await Promise.all([fetchRequests(), fetchChannels()]);
    } catch (err: any) {
      alert("Erreur : " + err.message);
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  // ============================================================
  // REJETER
  // ============================================================
  const rejectRequest = async (req: CreatorRequest) => {
    if (!confirm(`Refuser la demande de ${req.full_name} ?`)) return;
    setProcessing(req.id);
    await supabase.from("podcast_creator_requests" as any)
      .update({ status: "rejected" }).eq("id", req.id);
    await fetchRequests();
    setProcessing(null);
  };

  // ============================================================
  // BAN / UNBAN
  // ============================================================
  const toggleBan = async (channel: Channel) => {
    if (channel.is_banned) {
      if (!confirm(`Débannir "${channel.name}" ?`)) return;
      await supabase.from("podcast_channels" as any)
        .update({ is_banned: false, ban_reason: null }).eq("id", channel.id);
    } else {
      const reason = prompt(`Motif du bannissement de "${channel.name}" :`);
      if (!reason) return;
      await supabase.from("podcast_channels" as any)
        .update({ is_banned: true, ban_reason: reason }).eq("id", channel.id);
    }
    await fetchChannels();
  };

  // ============================================================
  // FILTRES
  // ============================================================
  const pendingRequests  = requests.filter(r => r.status === "pending");
  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ch.creator_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)" }}>
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl">Accès non autorisé</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          Ce panneau est réservé aux administrateurs MIREC.
          {!user && " Connecte-toi d'abord."}
          {user && " Ton compte n'a pas le rôle admin dans la table profiles."}
        </p>
        <button onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  // ============================================================
  // PANNEAU ADMIN COMPLET
  // ============================================================
  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(160deg, #0d0820, #1a0838)" }}>

      {/* HEADER */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(13,8,32,0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(139,92,246,0.2)" }}>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <h1 className="font-bold text-base text-white">Panneau Admin</h1>
        </div>
        <button onClick={() => { fetchRequests(); fetchChannels(); }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* STATS RAPIDES */}
      <div className="px-4 pt-4 pb-2">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
          {[
            { val: pendingRequests.length, label: "En attente", color: "#D97706", icon: Clock },
            { val: channels.length,        label: "Canaux",     color: "#7C3AED", icon: Radio },
            { val: channels.filter(c => c.is_banned).length, label: "Bannis", color: "#DC2626", icon: Ban },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-3 text-center"
              style={{ background: s.color + "15", border: `1px solid ${s.color}33` }}>
              <p className="font-bold text-lg text-white">{s.val}</p>
              <p className="text-[10px] mt-0.5" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ONGLETS */}
      <div className="px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-1">
          {[
            { key: "requests", label: `Demandes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`, icon: Users },
            { key: "channels", label: `Canaux (${channels.length})`, icon: Radio },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key ? "text-white" : "text-white/40 bg-white/5"}`}
              style={activeTab === tab.key ? { background: "linear-gradient(135deg, #7C3AED44, #4F46E544)", border: "1px solid rgba(124,58,237,0.4)" } : {}}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-10 max-w-lg mx-auto">

        {/* ── ONGLET DEMANDES ── */}
        {activeTab === "requests" && (
          loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Check className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/50 text-sm">Aucune demande</p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {requests.map(req => (
                <div key={req.id} className="rounded-2xl p-4"
                  style={{
                    background: req.status === "pending" ? "rgba(255,255,255,0.06)" : req.status === "approved" ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",
                    border: `1px solid ${req.status === "pending" ? "rgba(255,255,255,0.1)" : req.status === "approved" ? "rgba(5,150,105,0.3)" : "rgba(220,38,38,0.3)"}`,
                  }}>

                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: req.status === "pending" ? "rgba(217,119,6,0.2)" : req.status === "approved" ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)",
                        color: req.status === "pending" ? "#D97706" : req.status === "approved" ? "#059669" : "#DC2626",
                      }}>
                      {req.status === "pending" ? "⏳ En attente" : req.status === "approved" ? "✅ Approuvé" : "❌ Refusé"}
                    </span>
                    <span className="text-[10px] text-white/40">{timeAgo(req.created_at)}</span>
                  </div>

                  <p className="font-bold text-sm text-white mb-0.5">{req.full_name}</p>
                  <p className="text-xs text-purple-300 mb-1">{req.ministry}</p>
                  <p className="text-[11px] text-white/40 mb-1">{CREATOR_TYPE_LABEL[req.creator_type] || req.creator_type}</p>

                  {req.description && (
                    <p className="text-xs text-white/60 leading-relaxed mb-2 line-clamp-2">{req.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-white/40 mb-3">
                    <span>📞 {req.contact}</span>
                    {req.email && <span>· {req.email}</span>}
                  </div>

                  {/* Actions — seulement pour pending */}
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveRequest(req)}
                        disabled={processing === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                        {processing === req.id
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <><Check className="w-3.5 h-3.5" /> Approuver</>
                        }
                      </button>
                      <button
                        onClick={() => rejectRequest(req)}
                        disabled={processing === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: "rgba(220,38,38,0.4)", border: "1px solid rgba(220,38,38,0.5)" }}>
                        <X className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── ONGLET CANAUX ── */}
        {activeTab === "channels" && (
          <>
            <div className="relative mt-2 mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher un canal ou créateur..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Radio className="w-12 h-12 text-white/20 mb-3" />
                <p className="text-white/50 text-sm">Aucun canal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChannels.map(ch => (
                  <div key={ch.id} className="rounded-2xl p-4"
                    style={{
                      background: ch.is_banned ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${ch.is_banned ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-white truncate">{ch.name}</p>
                          {ch.is_verified && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                          {ch.is_banned && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-red-300"
                              style={{ background: "rgba(220,38,38,0.2)" }}>BAN</span>
                          )}
                        </div>
                        <p className="text-xs text-white/50">👤 {ch.creator_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/40">{ch.episode_count} épisodes</span>
                          <span className="text-[10px] text-white/40">{timeAgo(ch.created_at)}</span>
                        </div>
                        {ch.is_banned && ch.ban_reason && (
                          <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg" style={{ background: "rgba(220,38,38,0.1)" }}>
                            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-300">{ch.ban_reason}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleBan(ch)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
                        style={ch.is_banned ? {
                          background: "rgba(5,150,105,0.2)", color: "#10b981", border: "1px solid rgba(5,150,105,0.3)"
                        } : {
                          background: "rgba(220,38,38,0.15)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)"
                        }}>
                        <Ban className="w-3 h-3" />
                        {ch.is_banned ? "Débannir" : "Bannir"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
