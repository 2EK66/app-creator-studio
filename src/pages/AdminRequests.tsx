import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";

export default function AdminRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Vérification admin (optionnelle mais sécurisée)
  if (user?.email !== "admin@mirec.org") {
    return <div className="p-8 text-white">Accès refusé.</div>;
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("podcast_creator_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRequests(data || []);
    setLoading(false);
  };

  const approve = async (req) => {
    if (!confirm(`Approuver la demande de ${req.full_name} ?`)) return;
    // Vérifier si un canal n'existe pas déjà pour ce créateur
    const { data: existing } = await supabase
      .from("podcast_channels")
      .select("id")
      .eq("creator_id", req.user_id)
      .maybeSingle();
    if (existing) {
      alert("Ce créateur a déjà un canal. Demande ignorée.");
      return;
    }
    const { error: updateError } = await supabase
      .from("podcast_creator_requests")
      .update({ status: "approved" })
      .eq("id", req.id);
    if (updateError) {
      alert("Erreur lors de l'approbation.");
      return;
    }
    const { error: insertError } = await supabase
      .from("podcast_channels")
      .insert({
        creator_id: req.user_id,
        name: req.ministry,
        description: req.description,
        category: req.creator_type,
        is_verified: true,
        is_banned: false,
      });
    if (insertError) {
      alert("Canal créé avec succès mais erreur d'insertion ?");
      console.error(insertError);
    } else {
      alert("Canal créé !");
    }
    fetchRequests(); // recharge la liste
  };

  const reject = async (req) => {
    if (!confirm(`Refuser la demande de ${req.full_name} ?`)) return;
    await supabase
      .from("podcast_creator_requests")
      .update({ status: "rejected" })
      .eq("id", req.id);
    fetchRequests();
  };

  if (loading) return <div className="text-white p-8">Chargement...</div>;
  if (error) return <div className="text-red-500 p-8">Erreur : {error}</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-4 hover:bg-white/10 p-2 rounded">
        <ArrowLeft /> Retour à l'accueil
      </button>
      <h1 className="text-xl font-bold mb-4">Demandes créateur</h1>
      {requests.length === 0 ? (
        <p className="text-white/50">Aucune demande en attente.</p>
      ) : (
        requests.map(req => (
          <div key={req.id} className="bg-white/10 p-4 rounded-xl mb-3">
            <p><strong>{req.full_name}</strong> – {req.ministry}</p>
            <p className="text-sm text-white/70">{req.description}</p>
            <p className="text-xs text-white/50 mt-1">Contact : {req.contact}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => approve(req)} className="bg-green-600 px-3 py-1 rounded flex items-center gap-1">
                <Check className="w-4 h-4" /> Approuver
              </button>
              <button onClick={() => reject(req)} className="bg-red-600/70 px-3 py-1 rounded flex items-center gap-1">
                <X className="w-4 h-4" /> Refuser
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
