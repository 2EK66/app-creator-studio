import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import {
  Users, MessageCircle, Calendar, Briefcase,
  Plus, ArrowLeft, Send, Lock, Globe, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ============================================================
// TYPES
// ============================================================
interface Group {
  id: string;
  name: string;
  visibility: string;
  created_by: string | null;
  created_at: string;
  member_count: number;
  is_member: boolean;
}

interface GroupMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  created_by: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  budget_goal: number | null;
  budget_current: number | null;
  deadline: string | null;
  created_by: string | null;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

// ============================================================
// GROUP LIST
// ============================================================
function GroupListView({ groups, loading, onSelect, onJoin, onRefresh, refreshing, onShowCreate }: {
  groups: Group[];
  loading: boolean;
  onSelect: (g: Group) => void;
  onJoin: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onShowCreate: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onRefresh} disabled={refreshing} className="p-2 rounded-full hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <button onClick={onShowCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
          <Plus className="w-4 h-4" /> Créer un groupe
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun groupe pour l'instant</p>
        </div>
      ) : groups.map(g => (
        <div key={g.id} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => g.is_member && onSelect(g)}>
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {g.visibility === "private" ? <Lock className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">{g.name}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {g.member_count} membre{g.member_count > 1 ? "s" : ""}
                  {g.visibility === "private" && " · Privé"}
                </p>
              </div>
            </div>
            {g.is_member ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10">Membre</span>
            ) : (
              <button onClick={() => onJoin(g.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground">
                Rejoindre
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// CREATE GROUP MODAL
// ============================================================
function CreateGroupModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, visibility: string) => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreate(name.trim(), visibility);
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-foreground">Créer un groupe</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du groupe"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex gap-2">
          <button onClick={() => setVisibility("public")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${
              visibility === "public" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Globe className="w-4 h-4" /> Public
          </button>
          <button onClick={() => setVisibility("private")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${
              visibility === "private" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Lock className="w-4 h-4" /> Privé
          </button>
        </div>
        <button onClick={submit} disabled={creating || !name.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
          {creating ? "Création..." : "Créer"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// GROUP SPACE (chat, events, projects)
// ============================================================
type GroupTab = "chat" | "events" | "projects";

function GroupSpace({ group, onBack }: { group: Group; onBack: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<GroupTab>("chat");

  const tabs: { id: GroupTab; label: string; icon: any }[] = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "events", label: "Événements", icon: Calendar },
    { id: "projects", label: "Projets", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-foreground truncate">{group.name}</h2>
            <p className="text-[11px] text-muted-foreground">{group.member_count} membres</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto flex border-t border-border/30">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-w-lg mx-auto">
        {tab === "chat" && <GroupChat groupId={group.id} userId={user?.id} />}
        {tab === "events" && <GroupEventsTab />}
        {tab === "projects" && <GroupProjectsTab />}
      </div>
    </div>
  );
}

// ============================================================
// CHAT
// ============================================================
function GroupChat({ groupId, userId }: { groupId: string; userId?: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data: msgs } = await supabase
      .from("group_messages").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (msgs) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", senderIds.length ? senderIds : ["none"]);
      const map = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || "Anonyme"]));
      setMessages(msgs.map(m => ({ ...m, sender_name: m.sender_id === userId ? "Moi" : (map[m.sender_id] || "Anonyme") })));
    }
    setLoading(false);
  }, [groupId, userId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const send = async () => {
    if (!text.trim() || !userId) return;
    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId, sender_id: userId, content: text.trim(),
    });
    if (!error) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), content: text.trim(),
        created_at: new Date().toISOString(), sender_id: userId, sender_name: "Moi",
      }]);
      setText("");
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Aucun message. Sois le premier !</p>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Écrire un message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={send} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EVENTS TAB (uses global events table)
// ============================================================
function GroupEventsTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = async () => {
    if (!title.trim() || !date || !user) return;
    const { error } = await supabase.from("events").insert({
      title: title.trim(), event_date: date, description: desc || null, created_by: user.id,
    });
    if (!error) {
      setTitle(""); setDate(""); setDesc(""); setShowNew(false);
      fetchEvents();
    }
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Événements</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Créer
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none resize-none" rows={2} />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={createEvent} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Créer</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun événement</p>
        </div>
      ) : events.map(ev => (
        <div key={ev.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <h4 className="font-bold text-sm text-foreground mb-1">{ev.title}</h4>
          <p className="text-xs text-muted-foreground mb-1">📅 {formatDate(ev.event_date)}</p>
          {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PROJECTS TAB (uses global projects table)
// ============================================================
function GroupProjectsTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("community");

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async () => {
    if (!title.trim() || !user) return;
    const { error } = await supabase.from("projects").insert({
      title: title.trim(), description: desc || null, category, created_by: user.id,
    });
    if (!error) {
      setTitle(""); setDesc(""); setShowNew(false);
      fetchProjects();
    }
  };

  const statusConf: Record<string, { label: string; color: string; bg: string }> = {
    en_cours:  { label: "En cours",   color: "#D97706", bg: "#FFFBEB" },
    termine:   { label: "Terminé ✓", color: "#059669", bg: "#ECFDF5" },
    en_attente: { label: "En attente", color: "#6B7280", bg: "#F3F4F6" },
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Projets</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Nouveau
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du projet"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none resize-none" rows={2} />
          <div className="flex gap-2">
            <button onClick={() => setCategory("community")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${category === "community" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              🤝 Communautaire
            </button>
            <button onClick={() => setCategory("business")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${category === "business" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              💼 Entreprise
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={createProject} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Créer</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun projet</p>
        </div>
      ) : projects.map(p => {
        const sc = statusConf[p.status] || { label: p.status, color: "#6B7280", bg: "#F3F4F6" };
        return (
          <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                p.category === "business" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
              }`}>
                {p.category === "business" ? "💼 Entreprise" : "🤝 Communautaire"}
              </span>
            </div>
            {p.description && <p className="text-xs text-muted-foreground mb-2">{p.description}</p>}
            {p.budget_goal && (
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Budget</span>
                  <span>{p.budget_current || 0} / {p.budget_goal} FCFA</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, ((p.budget_current || 0) / p.budget_goal) * 100)}%` }} />
                </div>
              </div>
            )}
            {p.deadline && <p className="text-[10px] text-muted-foreground">📅 Échéance: {new Date(p.deadline).toLocaleDateString("fr")}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data: groupsData } = await supabase.from("groups").select("*");
    if (!groupsData) { setLoading(false); setRefreshing(false); return; }
    const { data: members } = await supabase.from("group_members").select("group_id, profile_id");
    const enriched: Group[] = groupsData.map(g => ({
      ...g,
      member_count: members?.filter(m => m.group_id === g.id).length || 0,
      is_member: !!members?.find(m => m.group_id === g.id && m.profile_id === user?.id),
    }));
    setGroups(enriched);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { if (user) fetchGroups(); else setLoading(false); }, [user, fetchGroups]);

  const createGroup = async (name: string, visibility: string) => {
    if (!user) { navigate("/auth"); return; }
    const { data, error } = await supabase.from("groups").insert({
      name, visibility, created_by: user.id,
    }).select().single();
    if (data && !error) {
      await supabase.from("group_members").insert({ group_id: data.id, profile_id: user.id });
      setShowCreate(false);
      fetchGroups();
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) { navigate("/auth"); return; }
    await supabase.from("group_members").insert({ group_id: groupId, profile_id: user.id });
    fetchGroups();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder aux groupes</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          Se connecter
        </button>
      </div>
    );
  }

  if (selectedGroup) {
    return <GroupSpace group={selectedGroup} onBack={() => { setSelectedGroup(null); fetchGroups(); }} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="font-bold text-xl text-foreground">Communauté</h1>
          <p className="text-xs text-muted-foreground">Groupes, événements et projets</p>
        </div>
      </header>
      <GroupListView
        groups={groups} loading={loading}
        onSelect={setSelectedGroup} onJoin={joinGroup}
        onRefresh={() => fetchGroups(true)} refreshing={refreshing}
        onShowCreate={() => setShowCreate(true)}
      />
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={createGroup} />}
    </div>
  );
}
