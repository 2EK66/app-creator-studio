import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { Moon, Sun, Download, LogOut, ChevronRight, User, Mail, Edit3, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setAvatarUrl(data.avatar_url || "");
        }
      });
  }, [user]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mirec-theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("mirec-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, username }).eq("id", user.id);
    setSaving(false);
    setEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder à ton profil</p>
        <button
          onClick={() => navigate("/auth")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24 px-4 pt-6">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <Avatar name={fullName || user.email || "U"} url={avatarUrl} size={80} />
        {!editing ? (
          <>
            <h2 className="font-display text-xl font-bold text-foreground mt-3">{fullName || "Utilisateur"}</h2>
            {username && <p className="text-sm text-muted-foreground">@{username}</p>}
            <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
          </>
        ) : (
          <div className="w-full mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Nom complet</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Nom d'utilisateur</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> {saving ? "..." : "Enregistrer"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
        {!editing && (
          <SettingsRow
            icon={<Edit3 className="w-4 h-4" />}
            label="Modifier le profil"
            onClick={() => setEditing(true)}
          />
        )}

        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/30">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            <span className="text-sm font-medium text-foreground">Mode sombre</span>
          </div>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </div>

        <SettingsRow
          icon={<Download className="w-4 h-4" />}
          label="Télécharger l'application"
          subtitle="Bientôt disponible (APK Android)"
          onClick={() => {
            // TODO: Replace with actual APK download URL
            window.open("https://github.com/2EK66/MIREC/releases", "_blank");
          }}
        />

        <div className="border-b border-border/30" />

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Se déconnecter</span>
        </button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-8">MIREC v1.0 · Communauté de foi</p>
    </div>
  );
}

function SettingsRow({ icon, label, subtitle, onClick }: {
  icon: React.ReactNode; label: string; subtitle?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/30 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-primary">{icon}</span>
        <div className="text-left">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
