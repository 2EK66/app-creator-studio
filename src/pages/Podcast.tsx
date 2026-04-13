import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, Users, Lock, ChevronRight,
  Check, X, BookOpen, Headphones, Wifi, Star, Play, Pause
} from "lucide-react";

// ─── MODAL DEMANDE CRÉATEUR ───────────────────────────────
function CreatorRequestModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    ministry: "",
    creator_type: "pasteur",
    description: "",
    contact: "",
  });

  const field = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.full_name || !form.ministry || !form.description || !form.contact) return;
    if (!user) {
      setErrorMsg("Vous devez être connecté.");
      return;
    }

    setSending(true);
    setErrorMsg("");

    try {
      // 🔹 vérifier si déjà une demande
      const { data: existing } = await supabase
        .from("podcast_creator_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setErrorMsg(
          existing.status === "pending"
            ? "Demande déjà en attente ⏳"
            : "Tu as déjà fait une demande"
        );
        setSending(false);
        return;
      }

      // 🔹 insert
      const { error } = await supabase
        .from("podcast_creator_requests")
        .insert({
          user_id: user.id,
          email: user.email || "",
          full_name: form.full_name,
          ministry: form.ministry,
          creator_type: form.creator_type,
          description: form.description,
          contact: form.contact,
          status: "pending",
        });

      if (error) throw error;

      setStep("success");
      onSuccess();

    } catch (e) {
      console.error(e);
      setErrorMsg("Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center"
      onClick={() => !sending && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "90vh", background: "#0f0828" }}
        onClick={e => e.stopPropagation()}
      >
        {step === "success" ? (
          <div className="text-center p-6">
            <Check className="text-green-400 mx-auto mb-3" />
            <p className="text-white">Demande envoyée ✅</p>
            <button onClick={onClose} className="mt-4 bg-purple-600 px-4 py-2 rounded text-white">
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <h3 className="text-white font-bold">Devenir créateur</h3>

            <input placeholder="Nom complet"
              onChange={field("full_name")}
              className="w-full p-2 rounded bg-black/50 text-white" />

            <input placeholder="Ministère"
              onChange={field("ministry")}
              className="w-full p-2 rounded bg-black/50 text-white" />

            <input placeholder="Contact"
              onChange={field("contact")}
              className="w-full p-2 rounded bg-black/50 text-white" />

            <textarea placeholder="Description"
              onChange={field("description")}
              className="w-full p-2 rounded bg-black/50 text-white" />

            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

            <button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full bg-purple-600 py-2 rounded text-white"
            >
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────
export default function Podcast() {
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const [requestStatus, setRequestStatus] = useState<null | string>(null);
  const [isCreator, setIsCreator] = useState(false);

  // 🔹 charger statut demande
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("podcast_creator_requests")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      setRequestStatus(data?.status || null);

      const { data: channel } = await supabase
        .from("podcast_channels")
        .select("id")
        .eq("creator_id", user.id)
        .maybeSingle();

      setIsCreator(!!channel);
    };

    load();
  }, [user]);

  return (
    <div className="max-w-lg mx-auto pb-28 min-h-screen">

      {/* HERO */}
      <div className="text-center p-6">
        <Radio className="mx-auto text-purple-400 mb-3" />
        <h1 className="text-white font-bold text-xl">Podcast MIREC</h1>
        <p className="text-white/50 text-sm">
          Partage tes enseignements et prédications
        </p>
      </div>

      {/* STATUS */}
      <div className="px-4 text-center mb-4">
        {requestStatus === "pending" && (
          <p className="text-yellow-400 text-xs">Demande en attente ⏳</p>
        )}
        {requestStatus === "approved" && (
          <p className="text-green-400 text-xs">Accès validé ✅</p>
        )}
      </div>

      {/* CTA */}
      <div className="px-4">
        {isCreator ? (
          <button className="w-full bg-purple-600 py-3 rounded text-white">
            Accéder à l’espace créateur 🎙️
          </button>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-purple-600 py-3 rounded text-white"
          >
            Demander accès créateur
          </button>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <CreatorRequestModal
          onClose={() => setShowForm(false)}
          onSuccess={() => setRequestStatus("pending")}
        />
      )}
    </div>
  );
}
