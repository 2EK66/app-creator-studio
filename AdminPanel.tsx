// src/pages/AdminPanel.tsx (VERSION CORRIGÉE)

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, Check, X, UserX, Ban, Radio, 
  Shield, RefreshCw, Search 
} from "lucide-react";

interface CreatorRequest {
  id: string;
  user_id: string; // ✅ AJOUT IMPORTANT
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
  subscriber_count?: number;
  created_at: string;
  creator_name?: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Vérification admin sécurisée
  useEffect(() => {
    if (!user) return;

    supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle() // ✅ évite crash
      .then(({ data }) => {
        if (data?.role === "admin") setIsAdmin(true);
        else onClose();
      });
  }, [user]);

  // ✅ Charger demandes
  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("podcast_creator_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    if (data) setRequests(data);
  };

  // ✅ Charger chaînes
  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from("podcast_channels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;

    // 🔥 enrichir avec profil (SANS auth.admin)
    const enriched = await Promise.all(
      data.map(async (ch) => {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", ch.creator_id)
          .maybeSingle();

        return {
          ...ch,
          creator_name: profile?.full_name || "Inconnu",
        };
      })
    );

    setChannels(enriched);
  };

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    Promise.all([fetchRequests(), fetchChannels()])
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // ✅ APPROUVER (corrigé)
  const approveRequest = async (req: CreatorRequest) => {
    try {
      // 1. update demande
      await supabase
        .from("podcast_creator_requests")
        .update({ status: "approved" })
        .eq("id", req.id);

      // 2. créer channel
      await supabase
        .from("podcast_channels")
        .insert({
          creator_id: req.user_id,
          name: req.ministry,
          description: req.description,
          category: req.creator_type,
          is_verified: true,
          is_banned: false,
        });

      // 3. donner rôle creator
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: req.user_id,
          role: "creator",
          is_banned: false,
        }, { onConflict: "user_id" });

      fetchRequests();
      fetchChannels();

    } catch (err) {
      console.error("Erreur approve:", err);
    }
  };

  // ❌ REJETER
  const rejectRequest = async (req: CreatorRequest) => {
    await supabase
      .from("podcast_creator_requests")
      .update({ status: "rejected" })
      .eq("id", req.id);

    fetchRequests();
  };

  // 🔥 BAN
  const banChannel = async (channel: Channel) => {
    const reason = prompt("Motif du bannissement:");
    if (!reason) return;

    await supabase
      .from("podcast_channels")
      .update({ is_banned: true, ban_reason: reason })
      .eq("id", channel.id);

    fetchChannels();
  };

  const unbanChannel = async (channel: Channel) => {
    await supabase
      .from("podcast_channels")
      .update({ is_banned: false, ban_reason: null })
      .eq("id", channel.id);

    fetchChannels();
  };

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="p-4 flex justify-between border-b border-white/10">
        <button onClick={onClose}><ArrowLeft /></button>
        <h1>Admin Panel</h1>
        <div />
      </div>

      {/* DEMANDES */}
      <div className="p-4">
        <h2 className="mb-4">Demandes ({requests.length})</h2>

        {requests.map(req => (
          <div key={req.id} className="bg-white/5 p-4 rounded-xl mb-3">
            <p>{req.full_name}</p>
            <p className="text-sm text-white/50">{req.ministry}</p>

            <div className="flex gap-2 mt-3">
              <button onClick={() => approveRequest(req)} className="bg-green-600 p-2 rounded">
                <Check />
              </button>
              <button onClick={() => rejectRequest(req)} className="bg-red-600 p-2 rounded">
                <X />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CHANNELS */}
      <div className="p-4">
        <input
          placeholder="Recherche..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full mb-4 p-2 bg-white/10 rounded"
        />

        {filteredChannels.map(ch => (
          <div key={ch.id} className="bg-white/5 p-4 rounded-xl mb-3">
            <p>{ch.name}</p>
            <p className="text-sm text-white/50">{ch.creator_name}</p>

            <button
              onClick={() => ch.is_banned ? unbanChannel(ch) : banChannel(ch)}
              className="mt-2 bg-red-500 p-2 rounded"
            >
              {ch.is_banned ? "Débannir" : "Bannir"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
