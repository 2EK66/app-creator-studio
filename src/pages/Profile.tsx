import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import {
  Moon, Sun, Download, LogOut, ChevronRight,
  Edit3, Check, X, FileText, Award, BarChart2,
  Briefcase, Plus, Trash2, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

// ============================================================
// TYPES
// ============================================================
interface Skill {
  id: string;
  skill: string;
  level: string;
  description: string;
}

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
// COMPÉTENCES SUGGÉRÉES
// ============================================================
const SKILL_SUGGESTIONS = [
  "Couture & tissage", "Coiffure", "Cuisine", "Pâtisserie",
  "Plomberie", "Électricité", "Maçonnerie", "Menuiserie",
  "Informatique", "Développement web", "Graphisme", "Photographie",
  "Comptabilité", "Gestion", "Marketing", "Commerce",
  "Médecine", "Infirmerie", "Pharmacie",
  "Agriculture", "Élevage", "Jardinage",
  "Enseignement", "Langues", "Musique", "Chant",
  "Mécanique auto", "Électronique", "Soudure",
  "Conduite", "Livraison", "Transport",
];

const SKILL_LEVELS = [
  { value: "debutant",      label: "Débutant",      stars: 1, color: "#6B7280" },
  { value: "intermediaire", label: "Intermédiaire", stars: 2, color: "#D97706" },
  { value: "avance",        label: "Avancé",        stars: 3, color: "#059669" },
  { value: "expert",        label: "Expert",        stars: 4, color: "#1A4B9B" },
  { value: "professionnel", label: "Pro",           stars: 5, color: "#7C3AED" },
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

function StarRating({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className="w-3 h-3"
          fill={i <= count ? color : "transparent"}
          stroke={i <= count ? color : "#D1D5DB"} />
      ))}
    </div>
  );
}

// ============================================================
// COMPOSANT COMPÉTENCES
// ============================================================
function SkillsSection({ userId }: { userId: string }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState("intermediaire");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (supabase
      .from("member_skills" as any)
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false }) as any)
      .then(({ data }: any) => {
        if (data) setSkills(data as Skill[]);
        setLoading(false);
      });
  }, [userId]);

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(newSkill.toLowerCase()) && newSkill.length > 0
  );

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setSaving(true);
    const { data, error } = await (supabase
      .from("member_skills" as any)
      .insert({ profile_id: userId, skill: newSkill.trim(), level: newLevel, description: newDesc.trim() || null })
      .select()
      .single() as any);
    if (!error && data) {
      setSkills(prev => [data as Skill, ...prev]);
      setNewSkill(""); setNewLevel("intermediaire"); setNewDesc("");
      setShowForm(false); setShowSuggestions(false);
    }
    setSaving(false);
  };

  const deleteSkill = async (id: string) => {
    await (supabase.from("member_skills" as any).delete().eq("id", id) as any);
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const levelConfig = (level: string) => SKILL_LEVELS.find(l => l.value === level) || SKILL_LEVELS[1];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Mes compétences</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{skills.length}</span>
        </div>
        <button onClick={() => { setShowForm(!showForm); setShowSuggestions(false); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3 border border-border/30">
          <p className="text-xs font-semibold text-foreground">Nouvelle compétence</p>
          <div className="relative">
            <input value={newSkill}
              onChange={e => { setNewSkill(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ex: Couture, Comptabilité, Plomberie..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map(s => (
                  <button key={s} onClick={() => { setNewSkill(s); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Niveau</p>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map(l => (
                <button key={l.value} onClick={() => setNewLevel(l.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${newLevel === l.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  <StarRating count={l.stars} color={newLevel === l.value ? "#fff" : l.color} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description courte (optionnel) — ex: 10 ans d'expérience, disponible le week-end..."
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none resize-none" rows={2} />

          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setNewSkill(""); }}
              className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={addSkill} disabled={saving || !newSkill.trim()}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {saving ? "..." : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="text-3xl mb-2">💼</span>
          <p className="font-semibold text-sm text-foreground">Aucune compétence ajoutée</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoute tes compétences pour être trouvé par la communauté !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map(s => {
            const lc = levelConfig(s.level);
            return (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-background hover:border-primary/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-foreground">{s.skill}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: lc.color, backgroundColor: lc.color + "18" }}>
                      {lc.label}
                    </span>
                  </div>
                  <StarRating count={lc.stars} color={lc.color} />
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                </div>
                <button onClick={() => deleteSkill(s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {skills.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          👁 Visible par tous les membres · Les autres peuvent te contacter directement
        </p>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // NOUVEAU
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [pointsLog, setPointsLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "competences" | "badges" | "points">("posts");
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, username, avatar_url, points_total").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setAvatarUrl(data.avatar_url || null); // NOUVEAU
          setPoints(data.points_total || 0);
        }
      });
  }, [user]);
  
  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    supabase.from("posts").select("id, content, type, created_at").eq("author_id", user.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(async ({ data }) => {
        if (!data) { setLoadingPosts(false); return; }
        const enriched = await Promise.all(data.map(async (post) => {
          const { data: rx } = await supabase.from("reactions").select("type").eq("content_id", post.id);
          const r = { amen: 0, feu: 0, coeur: 0 };
          rx?.forEach((x: any) => { if (x.type in r) r[x.type as keyof typeof r]++; });
          return { ...post, reactions: r };
        }));
        setPosts(enriched);
        setLoadingPosts(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("badges").select("*").eq("profile_id", user.id)
      .then(({ data }) => { if (data) setBadges(data); });
  }, [user]);

  useEffect(() => {
    if (!user || activeTab !== "points") return;
    supabase.from("points_log").select("*").eq("profile_id", user.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setPointsLog(data); });
  }, [user, activeTab]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mirec-theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("mirec-theme");
    if (saved === "dark") { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, username }).eq("id", user.id);
    setSaving(false);
    setEditing(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    setUploading(true);
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user?.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user?.id);
    if (updateError) throw updateError;
    setAvatarUrl(urlData.publicUrl);
  } catch (error) {
    console.error("Erreur upload avatar:", error);
    alert("Impossible de changer la photo. Réessaie plus tard.");
  } finally {
    setUploading(false);
  }
};

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder à ton profil</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Se connecter</button>
      </div>
    );
  }

  const level = getLevel(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = level.max === 99999 ? 100 : Math.round(((points - level.min) / (level.max - level.min)) * 100);

  const actionLabel: Record<string, string> = {
    reaction: "👍 Réaction donnée", comment: "💬 Commentaire posté",
    post_testimony: "✨ Témoignage partagé", post_prayer: "🙏 Prière partagée",
    post_verse: "📖 Verset partagé", post_post: "📝 Post publié", group_message: "👥 Message de groupe",
  };

  return (
    <div className="max-w-lg mx-auto pb-28 px-4 pt-6">
      {/* HEADER */}
      <div className="flex flex-col items-center mb-6">
        <MirecAvatar
          initials={(fullName || user.email || "U").slice(0, 2).toUpperCase()}
          color="hsl(220 70% 35%)"
          size={80}
          url={avatarUrl}   // NOUVEAU : transmet l'URL de l'avatar
        />

      {/* HEADER */}
      <div className="flex flex-col items-center mb-6">
        <MirecAvatar initials={(fullName || user.email || "U").slice(0, 2).toUpperCase()} color="hsl(220 70% 35%)" size={80} />
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
              <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[{ val: posts.length, label: "Posts" }, { val: points, label: "Points" }, { val: badges.length, label: "Badges" }].map((s, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-3 text-center shadow-sm">
            <div className="text-lg font-bold text-foreground">{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* NIVEAU SPIRITUEL */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{level.icon}</span>
          <div className="flex-1">
            <p className="font-bold text-foreground">{level.name}</p>
            <p className="text-xs text-muted-foreground">
              {points} pts {nextLevel ? `· encore ${nextLevel.min - points} pts pour ${nextLevel.name}` : "· Niveau max !"}
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
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
                <span className={`text-[8px] font-medium text-center leading-tight ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                  {l.name.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABS — 4 onglets */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 mb-4 overflow-x-auto">
        {[
          { key: "posts",       icon: <FileText className="w-3 h-3" />,  label: `Posts (${posts.length})`   },
          { key: "competences", icon: <Briefcase className="w-3 h-3" />, label: "Compétences"               },
          { key: "badges",      icon: <Award className="w-3 h-3" />,     label: `Badges (${badges.length})` },
          { key: "points",      icon: <BarChart2 className="w-3 h-3" />, label: "Historique"                },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex-shrink-0 flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold transition-all
              ${activeTab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* CONTENU TABS */}
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
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: tc.color, backgroundColor: tc.bg }}>{tc.label}</span>
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

      {activeTab === "competences" && <SkillsSection userId={user.id} />}

      {activeTab === "badges" && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ALL_BADGES.map(b => {
            const earned = badges.find(e => e.badge_type === b.type);
            return (
              <div key={b.type} className={`bg-card border rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm transition-all
                ${earned ? "border-primary/30 bg-primary/5" : "border-border/50 opacity-50"}`}>
                <span className="text-2xl" style={{ filter: earned ? "none" : "grayscale(1)" }}>{b.icon}</span>
                <span className="text-[9px] font-semibold text-center text-foreground leading-tight">{b.label}</span>
                {earned ? <span className="text-[8px] text-green-600 font-bold">✓ Obtenu</span> : <span className="text-[9px] text-muted-foreground">🔒</span>}
              </div>
            );
          })}
        </div>
      )}

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

      {/* PARAMÈTRES */}
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
        {!editing && <SettingsRow icon={<Edit3 className="w-4 h-4" />} label="Modifier le profil" onClick={() => setEditing(true)} />}
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
  subtitle="Version 1.0 disponible (APK)"
  onClick={() => {
    const link = document.createElement('a');
    link.href = "https://jafhpkbtxcmzufznnbxc.supabase.co/storage/v1/object/public/app-mirec./app-debug.apk";
    link.download = "MIREC.apk";
    link.target = "_blank";
    link.click();
  }} 
/>
        <div className="border-b border-border/30" />
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors">
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
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/30 hover:bg-accent/50 transition-colors">
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
