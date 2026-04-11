import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, Users, Lock, ChevronRight,
  Check, X, BookOpen, Headphones, Wifi, Star, Play, Pause
} from "lucide-react";

// ─── FORMULAIRE DE DEMANDE D'ACCÈS CRÉATEUR ────────────────────────────────
function CreatorRequestModal({ onClose }: { onClose: () => void }) {
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
      setErrorMsg("Vous devez être connecté pour faire une demande.");
      return;
    }
    setSending(true);
    setErrorMsg("");
    try {
      const { error } = await supabase
        .from("podcast_creator_requests")
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: form.full_name,
          ministry: form.ministry,
          creator_type: form.creator_type,
          description: form.description,
          contact: form.contact,
          status: "pending",
        });
      if (error) throw error;
      setStep("success");
    } catch (e) {
      console.error(e);
      setErrorMsg("Erreur lors de l'envoi. Réessaie plus tard.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "90vh", background: "rgba(15,8,40,0.97)", border: "1px solid rgba(139,92,246,0.3)", borderBottom: "none" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {step === "success" ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <Check className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">Demande envoyée !</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Ta demande a été transmise à l'équipe MIREC. Nous l'examinerons et te contacterons sous 48–72 heures.
            </p>
            <button onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between py-4 border-b mb-5" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
              <div>
                <h3 className="font-bold text-lg text-white">Devenir créateur</h3>
                <p className="text-xs text-white/50 mt-0.5">Remplis ce formulaire pour demander l'accès</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-white/10">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: "full_name", label: "Nom complet *", placeholder: "Pasteur Jean-Paul Bokambanza", type: "input" },
                { key: "ministry", label: "Ministère / Église / Radio *", placeholder: "Radio Lumière, Église Bethel…", type: "input" },
                { key: "contact", label: "Contact (téléphone ou email) *", placeholder: "+229 96 00 00 00", type: "input" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-white/70 mb-1 block">{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={field(f.key as keyof typeof form)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)", focusRingColor: "rgba(139,92,246,0.4)" }}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Type de contenu</label>
                <select
                  value={form.creator_type} onChange={field("creator_type")}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <option value="pasteur">⛪ Pasteur / Prédicateur</option>
                  <option value="radio">📻 Radio chrétienne</option>
                  <option value="enseignant">📖 Enseignant biblique</option>
                  <option value="evangeliste">📣 Évangéliste</option>
                  <option value="autre">✨ Autre ministère</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 mb-1 block">Description du ministère *</label>
                <textarea
                  value={form.description} onChange={field("description")}
                  placeholder="Décris ton ministère, le type d'enseignements que tu souhaites partager…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}
                />
              </div>

              {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}

              <button
                onClick={handleSubmit}
                disabled={sending || !form.full_name || !form.ministry || !form.description || !form.contact}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity mt-2"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Envoyer ma demande <ChevronRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-[10px] text-white/30">
                L'équipe MIREC examinera ta demande sous 48–72 heures
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CARTE FONCTIONNALITÉ ───────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.2)", backdropFilter: "blur(8px)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-purple-300"
        style={{ background: "rgba(139,92,246,0.2)" }}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-white leading-tight">{title}</p>
      <p className="text-[11px] text-white/50 leading-snug">{desc}</p>
    </div>
  );
}

// ─── PAGE PODCAST PRINCIPALE ───────────────────────────────────────────────
export default function Podcast() {
  const [showForm, setShowForm] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const features = [
    { icon: <Mic2 className="w-5 h-5" />, title: "Enseignements audio", desc: "Partage messages et prédications en audio" },
    { icon: <Wifi className="w-5 h-5" />, title: "Lives & diffusions", desc: "Diffuse en direct depuis n'importe où" },
    { icon: <BookOpen className="w-5 h-5" />, title: "Séries bibliques", desc: "Organise tes contenus en séries thématiques" },
    { icon: <Users className="w-5 h-5" />, title: "Abonnements", desc: "Les auditeurs s'abonnent à ton canal" },
    { icon: <Headphones className="w-5 h-5" />, title: "Écoute hors-ligne", desc: "Télécharge pour écouter sans connexion" },
    { icon: <Star className="w-5 h-5" />, title: "Accès certifié", desc: "Réservé aux ministères accrédités MIREC" },
  ];

  const steps = [
    { num: "01", title: "Fais une demande", desc: "Soumets ton dossier : nom du ministère, type de contenu, contact" },
    { num: "02", title: "Validation MIREC", desc: "L'équipe examine ta demande sous 48–72h et t'accorde l'accès" },
    { num: "03", title: "Crée ton canal", desc: "Configure ton profil créateur : photo, description, réseaux" },
    { num: "04", title: "Publie & diffuse", desc: "Partage tes enseignements en audio ou en live, les membres s'abonnent" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-28 min-h-screen">

      {/* HERO */}
      <div className="relative overflow-hidden px-6 pt-12 pb-10 flex flex-col items-center text-center">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.35) 0%, transparent 65%)" }} />

        <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)" }}>
          <Lock className="w-3 h-3 text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-300">Bientôt disponible</span>
        </div>

        {/* Icône animée */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-3xl animate-pulse"
            style={{ background: "rgba(124,58,237,0.3)", filter: "blur(16px)", transform: "scale(1.2)" }} />
          <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", boxShadow: "0 8px 32px rgba(124,58,237,0.5)" }}>
            <Radio className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="relative font-bold text-2xl text-white mb-3 leading-tight">
          MIREC Podcast &<br />Enseignements
        </h1>
        <p className="relative text-sm text-white/55 leading-relaxed max-w-xs">
          Bientôt, pasteurs et radios chrétiennes pourront partager leurs enseignements, prédications et diffuser en live directement dans la communauté.
        </p>

        {/* Faux lecteur démo */}
        <div className="relative mt-6 w-full rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)", backdropFilter: "blur(8px)" }}>
          <button
            onClick={() => setDemoPlaying(p => !p)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
            {demoPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">🎙️ Aperçu — L'Espoir en Christ</p>
            <p className="text-[11px] text-white/45 truncate">Pasteur Samuel · Série : Foi & Victoire</p>
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: demoPlaying ? "38%" : "0%", background: "linear-gradient(90deg, #7C3AED, #a78bfa)", transition: "width 0.5s linear" }} />
            </div>
          </div>
          <span className="text-[11px] text-white/40 flex-shrink-0">34:12</span>
        </div>
      </div>

      {/* FONCTIONNALITÉS */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 px-1">Ce qui vous attend</p>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="mx-4 rounded-2xl p-5 mb-6"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.2)", backdropFilter: "blur(8px)" }}>
        <h3 className="font-bold text-base text-white mb-4">Comment ça marche ?</h3>
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3 mb-4 last:mb-0">
            <div className="w-8 h-8 rounded-full text-purple-300 text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
              {s.num}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", boxShadow: "0 6px 24px rgba(124,58,237,0.45)" }}>
          <Mic2 className="w-5 h-5" />
          Demander l'accès créateur
        </button>
        <p className="text-center text-xs text-white/30 mt-3">
          Réservé aux pasteurs, évangélistes et radios chrétiennes
        </p>
      </div>

      {showForm && <CreatorRequestModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
