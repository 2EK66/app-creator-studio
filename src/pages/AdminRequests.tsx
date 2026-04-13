import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, X } from "lucide-react";

export default function AdminRequests({ onClose }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    supabase.from("podcast_creator_requests").select("*").eq("status", "pending").then(({ data }) => setRequests(data));
  }, []);

  const approve = async (req) => {
    await supabase.from("podcast_creator_requests").update({ status: "approved" }).eq("id", req.id);
    await supabase.from("podcast_channels").insert({
      creator_id: req.user_id,
      name: req.ministry,
      description: req.description,
      category: req.creator_type,
      is_verified: true,
    });
    alert("Canal créé !");
    setRequests(requests.filter(r => r.id !== req.id));
  };

  const reject = async (req) => {
    await supabase.from("podcast_creator_requests").update({ status: "rejected" }).eq("id", req.id);
    setRequests(requests.filter(r => r.id !== req.id));
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <button onClick={onClose} className="flex items-center gap-2 mb-4"><ArrowLeft /> Retour</button>
      <h1 className="text-xl font-bold mb-4">Demandes créateur</h1>
      {requests.map(req => (
        <div key={req.id} className="bg-white/10 p-4 rounded-xl mb-3">
          <p><strong>{req.full_name}</strong> – {req.ministry}</p>
          <p className="text-sm">{req.description}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => approve(req)} className="bg-green-600 px-3 py-1 rounded"><Check /> Approuver</button>
            <button onClick={() => reject(req)} className="bg-red-600 px-3 py-1 rounded"><X /> Refuser</button>
          </div>
        </div>
      ))}
    </div>
  );
}
