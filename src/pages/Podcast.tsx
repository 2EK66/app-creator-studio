import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Radio, Mic2, Users, Lock, ChevronRight,
  Check, X, BookOpen, Headphones, Wifi, Star
} from "lucide-react";

// ─── FORMULAIRE DE DEMANDE D'ACCÈS CRÉATEUR ────────────────────────────────
function CreatorRequestModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    full_name:   "",
    ministry:    "",
    creator_type: "pasteur",
    description: "",
    contact:     "",
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
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {step === "success" ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-xl text-foreground mb-2">Demande envoyée !</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ta demande a été transmise à l'équipe MIREC. Nous l'examinerons et te contacterons sous 48–72 heures.
            </p>
            <button onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between py-4 border-b border-border/30 mb-5">
              <div>
                <h3 className="font-bold text-lg text-foreground">Devenir créateur</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Remplis ce formulaire pour demander l'accès</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Nom complet *</label>
                <input value={form.full_name} onChange={field("full_name")}
                  placeholder="Pasteur Jean-Paul Bokambanza"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Ministère / Église / Radio *</label>
                <input value={form.ministry} onChange={field("ministry")}
                  placeholder="Radio Lumière, Église Bethel…"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Type de contenu</label>
                <select value={form.creator_type} onChange={field("creator_type")}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="pasteur">⛪ Pasteur / Prédicateur</option>
                  <option value="radio">📻 Radio chrétienne</option>
                  <option value="enseignant">📖 Enseignant biblique</option>
                  <option value="evangeliste">📣 Évangéliste</option>
                  <option value="autre">✨ Autre ministère</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Description du ministère *</label>
                <textarea value={form.description} onChange={field("description")}
                  placeholder="Décris ton ministère, le type d'enseignements que tu souhaites partager…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Contact (téléphone ou email) *</label>
                <input value={form.contact} onChange={field("contact")}
                  placeholder="+243 81 234 5678"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive text-center">{errorMsg}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={sending || !form.full_name || !form.ministry || !form.description || !form.contact}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors mt-2">
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Envoyer ma demande <ChevronRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-[10px] text-muted-foreground">
                L'équipe MIREC examinera ta demande sous 48–72 heures
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE PODCAST PRINCIPALE ───────────────────────────────────────────────
export default function Podcast() {
  const [showForm, setShowForm] = useState(false);

  const features = [
    { icon: <Mic2 className="w-5 h-5" />,       title: "Enseignements audio",    desc: "Partage des messages et prédications en audio" },
    { icon: <Wifi className="w-5 h-5" />,        title: "Lives & diffusions",     desc: "Diffuse en direct depuis n'importe où" },
    { icon: <BookOpen className="w-5 h-5" />,    title: "Séries bibliques",       desc: "Organise tes contenus en séries thématiques" },
    { icon: <Users className="w-5 h-5" />,       title: "Abonnements",            desc: "Les auditeurs s'abonnent à ton canal" },
    { icon: <Headphones className="w-5 h-5" />,  title: "Hors-ligne",             desc: "Télécharge pour écouter sans connexion" },
    { icon: <Star className="w-5 h-5" />,        title: "Accès limité",           desc: "Réservé aux ministères accrédités MIREC" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-28 min-h-screen">

      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-background" />
        <div className="relative px-6 pt-14 pb-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Lock className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Bientôt disponible</span>
          </div>
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-5">
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-bold text-2xl text-foreground mb-3 leading-tight">
            MIREC Podcast &<br />Enseignements
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Bientôt, pasteurs et radios chrétiennes pourront partager leurs enseignements, prédications et diffuser en live directement dans la communauté.
          </p>
        </div>
      </div>

      {/* FONCTIONNALITÉS */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Ce qui vous attend</p>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                {f.icon}
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight mb-1">{f.title}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="mx-4 bg-card border border-border/50 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-base text-foreground mb-4">Comment ça marche ?</h3>
        {[
          { num: "01", title: "Fais une demande",     desc: "Soumets ton dossier : nom du ministère, type de contenu, contact" },
          { num: "02", title: "Validation MIREC",     desc: "L'équipe examine ta demande sous 48–72h et t'accorde l'accès" },
          { num: "03", title: "Crée ton canal",       desc: "Configure ton profil créateur : photo, description, réseaux" },
          { num: "04", title: "Publie & diffuse",     desc: "Partage tes enseignements en audio ou en live, les membres s'abonnent" },
        ].map((s, i) => (
          <div key={i} className="flex gap-3 mb-4 last:mb-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              {s.num}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors">
          <Mic2 className="w-5 h-5" />
          Demander l'accès créateur
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Réservé aux pasteurs, évangélistes et radios chrétiennes
        </p>
      </div>

      {showForm && <CreatorRequestModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
