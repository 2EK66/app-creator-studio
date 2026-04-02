import { useState } from "react";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

type Mode = "login" | "register" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Email invalide";
    if (mode !== "forgot" && password.length < 6) e.password = "Minimum 6 caractères";
    if (mode === "register") {
      if (!fullName.trim()) e.fullName = "Nom requis";
      if (password !== confirm) e.confirm = "Les mots de passe ne correspondent pas";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setAlert(null);

    // Mock auth — will be replaced with Supabase
    await new Promise((r) => setTimeout(r, 800));

    if (mode === "login") {
      setAlert({ type: "success", msg: "Connexion réussie !" });
      setTimeout(() => navigate("/"), 600);
    } else if (mode === "register") {
      setAlert({ type: "success", msg: "Compte créé ! Vérifie ton email pour confirmer." });
    } else {
      setAlert({ type: "success", msg: "Lien de réinitialisation envoyé sur " + email });
    }
    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setAlert(null);
    setPassword("");
    setConfirm("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mirec-900 via-mirec-800 to-mirec-700 flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-card rounded-3xl p-8 w-full max-w-[400px] shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <MirecLogo size={72} />
          <h1 className="font-display text-2xl font-bold text-foreground tracking-wider mt-3">MIREC</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "forgot" ? "Réinitialiser le mot de passe" : "Communauté de foi · Cotonou"}
          </p>
        </div>

        {/* Tabs */}
        {mode !== "forgot" && (
          <div className="flex bg-mirec-50 rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>
        )}

        {/* Alert */}
        {alert && (
          <div
            className={`p-3 rounded-xl text-sm mb-4 ${
              alert.type === "error"
                ? "bg-red-50 text-destructive border border-red-200"
                : "bg-emerald-50 text-success border border-emerald-200"
            }`}
          >
            {alert.type === "success" ? "✓ " : "⚠ "}
            {alert.msg}
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {mode === "register" && (
            <InputField
              label="Nom complet"
              value={fullName}
              onChange={setFullName}
              placeholder="Jean-Baptiste Koffi"
              error={errors.fullName}
            />
          )}

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ton@email.com"
            error={errors.email}
          />

          {mode !== "forgot" && (
            <div className="relative">
              <InputField
                label="Mot de passe"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                error={errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {mode === "register" && (
            <InputField
              label="Confirmer"
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="••••••••"
              error={errors.confirm}
            />
          )}

          {mode === "login" && (
            <button
              onClick={() => switchMode("forgot")}
              className="text-xs text-primary hover:underline ml-auto block"
            >
              Mot de passe oublié ?
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-mirec-800 to-mirec-900 text-white font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-display tracking-wide"
          >
            {loading
              ? "Chargement…"
              : mode === "login"
              ? "Se connecter"
              : mode === "register"
              ? "Rejoindre MIREC"
              : "Envoyer le lien"}
          </button>

          {mode === "forgot" && (
            <button
              onClick={() => switchMode("login")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto mt-2"
            >
              <ArrowLeft className="w-3 h-3" /> Retour à la connexion
            </button>
          )}
        </div>

        {/* Footer */}
        {mode !== "forgot" && (
          <p className="text-center text-[11px] text-muted-foreground mt-6 font-display italic leading-relaxed">
            "Car là où deux ou trois sont réunis en mon nom,
            <br />
            je suis au milieu d'eux." — Mat. 18:20
          </p>
        )}
      </div>

      <p className="text-white/40 text-[10px] mt-6 tracking-wide">MIREC · Application communautaire · v1.0</p>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground mb-1.5 block tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-3 rounded-xl border text-sm bg-background outline-none transition-all focus:ring-2 focus:ring-primary/30 ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <span className="text-[11px] text-destructive mt-1 block">{error}</span>}
    </div>
  );
}
