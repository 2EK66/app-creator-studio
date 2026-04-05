import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import {
  Moon, Sun, Download, LogOut, ChevronRight,
  Edit3, Check, X, FileText, Award, BarChart2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

// ============================================================
// NIVEAUX SPIRITUELS
// ============================================================
const LEVELS = [
  { name: "Nouveau croyant", min: 0,    max: 200,   icon: "🌱" },
  { name: "Disciple",        min: 200,  max: 600,   icon: "📖" },
  { name: "Serviteur",       min: 600,  max: 1500,  icon: "🙏" },
  { name: "Évangéliste",     min: 1500, max: 3000,  icon: "📣" },
  { name: "Ancien",          min: 3000, max: 6000,  icon: "⭐" },
  { name: "Prophète",        min: 6000, max: 99999, icon: "🏆" },
];

function getLevel(pts: number) {
  return LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[LEVELS.length - 1];
}

// ============================================================
// BADGES DISPONIBLES
// ============================================================
const ALL_BADGES = [
  { type: "baptise",      icon: "✝",  label: "Baptisé"        },
  { type: "lecteur",      icon: "📖", label: "Lecteur assidu" },
  { type: "intercesseur", icon: "🙏", label: "Intercesseur"   },
  { type: "louange",      icon: "🎶", label: "Louange"        },
  { type: "temoin",       icon: "✨", label: "Témoin"         },
  { type: "serviteur",    icon: "🤝", label: "Serviteur"      },
  { type: "fidele",       icon: "🔥", label: "Fidèle"         },
  { type: "champion",     icon: "🏆", label: "Champion"       },
];

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function typeConfig(type: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    testimony:    { label: "Témoignage", color: "#059669", bg: "#ECFDF5" },
    prayer:       { label: "Prière",     color: "#7C3AED", bg: "#F5F3FF" },
    announcement: { label: "Annonce",    color: "#1A4B9B", bg: "#EEF5FD" },
    verse:        { label: "Verset",     color: "#D97706", bg: "#FFFBEB" },
    post:         { label: "Post",       color: "#6B7280", bg: "#F3F4F6" },
  };
  return map[type] || map["post"];
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Profil de base
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  // Données enrichies
  const [points, setPoints] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [pointsLog, setPointsLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "badges" | "points">("posts");
  const [loadingPosts, setLoadingPosts] = useState(true);

  // ---- Charger le profil ----
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url, points_total")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setPoints(data.points_total || 0);
        }
      });
  }, [user]);

  // ---- Charger les posts ----
  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    supabase
      .from("posts")
      .select("id, content, type, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        if (!data) { setLoadingPosts(false); return; }
        // Réactions pour chaque post
        const enriched = await Promise.all(data.map(async (post) => {
          const { data: rx } = await supabase
            .from("reactions")
            .select("type")
            .eq("content_id", post.id);
          const r = { amen: 0, feu: 0, coeur: 0 };
          rx?.forEach((x: any) => { if (x.type in r) r[x.type as keyof typeof r]++; });
          return { ...post, reactions: r };
        }));
        setPosts(enriched);
        setLoadingPosts(false);
      });
  }, [user]);

  // ---- Charger les badges ----
  useEffect(() => {
    if (!user) return;
    supabase
      .from("badges")
      .select("*")
      .eq("profile_id", user.id)
      .then(({ data }) => { if (data) setBadges(data); });
  }, [user]);

  // ---- Charger l'historique points ----
  useEffect(() => {
    if (!user || activeTab !== "points") return;
    supabase
      .from("points_log")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setPointsLog(data); });
  }, [user, activeTab]);

  // ---- Dark mode ----
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

  // ---- Sauvegarder le profil ----
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

  // ---- Non connecté ----
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder à ton profil</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          Se connecter
        </button>
      </div>
    );
  }

  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = level.max === 99999 ? 100
    : Math.round(((points - level.min) / (level.max - level.min)) * 100);

  const actionLabel: Record<string, string> = {
    reaction:       "👍 Réaction donnée",
    comment:        "💬 Commentaire posté",
    post_testimony: "✨ Témoignage partagé",
    post_prayer:    "🙏 Prière partagée",
    post_verse:     "📖 Verset partagé",
    post_post:      "📝 Post publié",
    group_message:  "👥 Message de groupe",
  };

  return (
    <div className="max-w-lg mx-auto pb-28 px-4 pt-6">

      {/* ======== HEADER ======== */}
      <div className="flex flex-col items-center mb-6">
        <MirecAvatar
          initials={(fullName || user.email || "U").slice(0, 2).toUpperCase()}
          color="hsl(220 70% 35%)"
          size={80}
        />

        {!editing ? (
          <>
            <h2 className="font-bold text-xl text-foreground mt-3">{fullName || "Utilisateur"}</h2>
            {username && <p className="text-sm text-muted-foreground">@{username}</p>}
            <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
          </>
        ) : (
          <div className="w-full mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Nom complet</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Nom d'utilisateur</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> {saving ? "..." : "Enregistrer"}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======== STATS RAPIDES ======== */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { val: posts.length,       label: "Posts"   },
          { val: points,             label: "Points"  },
          { val: badges.length,      label: "Badges"  },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-3 text-center shadow-sm">
            <div className="text-lg font-bold text-foreground">{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ======== NIVEAU SPIRITUEL ======== */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{level.icon}</span>
          <div className="flex-1">
            <p className="font-bold text-foreground">{level.name}</p>
            <p className="text-xs text-muted-foreground">
              {points} pts
              {nextLevel ? ` · encore ${nextLevel.min - points} pts pour ${nextLevel.name}` : " · Niveau max !"}
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>

        {/* Barre de progression */}
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Parcours des niveaux */}
        <div className="flex items-center justify-between overflow-x-auto gap-1 pb-1">
          {LEVELS.map((l, i) => {
            const reached = points >= l.min;
            const current = l.name === level.name;
            return (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[44px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all
                  ${current ? "border-primary bg-primary/10 scale-110" : reached ? "border-primary/40 bg-primary/5" : "border-muted bg-muted/30"}`}>
                  <span style={{ opacity: reached ? 1 : 0.3 }}>{l.icon}</span>
                </div>
                <span className={`text-[8px] font-medium text-center leading-tight
                  ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                  {l.name.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======== TABS ======== */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 mb-4">
        {[
          { key: "posts",  icon: <FileText className="w-3.5 h-3.5" />, label: `Posts (${posts.length})`   },
          { key: "badges", icon: <Award className="w-3.5 h-3.5" />,    label: `Badges (${badges.length})` },
          { key: "points", icon: <BarChart2 className="w-3.5 h-3.5" />, label: "Historique"               },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
              ${activeTab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ======== POSTS ======== */}
      {activeTab === "posts" && (
        <div className="space-y-3 mb-5">
          {loadingPosts ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="text-4xl mb-3">📝</span>
              <p className="font-semibold text-foreground">Aucune publication</p>
              <p className="text-sm text-muted-foreground mt-1">Partage un témoignage ou une prière !</p>
            </div>
          ) : posts.map(post => {
            const tc = typeConfig(post.type);
            return (
              <div key={post.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: tc.color, backgroundColor: tc.bg }}>
                    {tc.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.content}</p>
                <div className="flex gap-3 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                  <span>🙏 {post.reactions.amen}</span>
                  <span>🔥 {post.reactions.feu}</span>
                  <span>❤️ {post.reactions.coeur}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======== BADGES ======== */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ALL_BADGES.map(b => {
            const earned = badges.find(e => e.badge_type === b.type);
            return (
              <div key={b.type} className={`bg-card border rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm transition-all
                ${earned ? "border-primary/30 bg-primary/5" : "border-border/50 opacity-50"}`}>
                <span className="text-2xl" style={{ filter: earned ? "none" : "grayscale(1)" }}>{b.icon}</span>
                <span className="text-[9px] font-semibold text-center text-foreground leading-tight">{b.label}</span>
                {earned
                  ? <span className="text-[8px] text-green-600 font-bold">✓ Obtenu</span>
                  : <span className="text-[9px] text-muted-foreground">🔒</span>
                }
              </div>
            );
          })}
        </div>
      )}

      {/* ======== HISTORIQUE POINTS ======== */}
      {activeTab === "points" && (
        <div className="space-y-2 mb-5">
          {pointsLog.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="text-4xl mb-3">📊</span>
              <p className="font-semibold text-foreground">Aucun historique</p>
              <p className="text-sm text-muted-foreground mt-1">Commence à interagir pour gagner des points !</p>
            </div>
          ) : pointsLog.map((log, i) => (
            <div key={log.id || i} className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
              <span className="text-sm text-foreground">{actionLabel[log.action] || log.action}</span>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-green-600">+{log.points} pts</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(log.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== PARAMÈTRES ======== */}
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
        {!editing && (
          <SettingsRow icon={<Edit3 className="w-4 h-4" />} label="Modifier le profil" onClick={() => setEditing(true)} />
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
          onClick={() => window.open("https://github.com/2EK66/MIREC/releases", "_blank")}
        />
        <div className="border-b border-border/30" />
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors">
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
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/30 hover:bg-accent/50 transition-colors">
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
