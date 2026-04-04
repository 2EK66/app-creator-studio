import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import {
  Users, MessageCircle, Calendar, Briefcase,
  BarChart2, Plus, ChevronRight, ArrowLeft,
  Lock, Globe, Check, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ============================================================
// TYPES
// ============================================================
interface Group {
  id: string;
  name: string;
  type: string;
  icon_emoji: string;
  description: string;
  visibility: string;
  created_at: string;
  is_member?: boolean;
  member_count?: number;
}

interface Message {
  id: string;
  content: string;
  is_prayer: boolean;
  created_at: string;
  sender_id: string;
  profiles: { full_name: string };
}

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  rsvp_count?: number;
  my_rsvp?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  ends_at: string;
  my_vote?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

function getInitials(name: string) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function typeConfig(type: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    official:  { color: "#1A4B9B", bg: "#EEF5FD", label: "Officiel"  },
    quartier:  { color: "#059669", bg: "#ECFDF5", label: "Quartier"  },
    ministere: { color: "#D97706", bg: "#FFFBEB", label: "Ministère" },
    defi:      { color: "#7C3AED", bg: "#F5F3FF", label: "Défi"      },
    prive:     { color: "#6B7280", bg: "#F3F4F6", label: "Privé"     },
  };
  return map[type] || map["prive"];
}

// ============================================================
// MOCK DATA (remplacer par Supabase en prod)
// ============================================================
const MOCK_GROUPS: Group[] = [
  { id: "1", name: "Groupe des jeunes", type: "ministere", icon_emoji: "🔥", description: "Espace des jeunes de MIREC", visibility: "public", created_at: "", is_member: true, member_count: 47 },
  { id: "2", name: "Chorale Hosanna",   type: "ministere", icon_emoji: "🎶", description: "Répétitions et partitions", visibility: "public", created_at: "", is_member: true, member_count: 23 },
  { id: "3", name: "Cellule Akpakpa",   type: "quartier",  icon_emoji: "🙏", description: "Cellule de prière du quartier", visibility: "public", created_at: "", is_member: false, member_count: 18 },
  { id: "4", name: "Diacres MIREC",     type: "official",  icon_emoji: "⛪", description: "Groupe officiel des diacres", visibility: "public", created_at: "", is_member: false, member_count: 8 },
  { id: "5", name: "Défi 21 jours",     type: "defi",      icon_emoji: "📖", description: "21 jours de lecture biblique", visibility: "public", created_at: "", is_member: true, member_count: 34 },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "m1", content: "Frères, on se retrouve samedi à 15h pour la sortie !", is_prayer: false, created_at: new Date(Date.now()-3600000).toISOString(), sender_id: "a", profiles: { full_name: "Jonas Kossou" } },
    { id: "m2", content: "Priez pour mon examen de lundi s'il vous plaît 🙏", is_prayer: true, created_at: new Date(Date.now()-1800000).toISOString(), sender_id: "b", profiles: { full_name: "Ama Sévi" } },
    { id: "m3", content: "Je serai là avec ma sœur !", is_prayer: false, created_at: new Date(Date.now()-600000).toISOString(), sender_id: "c", profiles: { full_name: "Ruth Dossou" } },
  ],
};

const MOCK_EVENTS: Record<string, Event[]> = {
  "1": [
    { id: "e1", title: "Sortie plage Fidjrossè", description: "Journée de fellowship et de louange au bord de la mer", location: "Fidjrossè, Cotonou", event_date: new Date(Date.now()+3*86400000).toISOString(), rsvp_count: 23, my_rsvp: "going" },
    { id: "e2", title: "Culte de jeunesse", description: "Culte mensuel dédié aux jeunes", location: "Église principale MIREC", event_date: new Date(Date.now()+7*86400000).toISOString(), rsvp_count: 41, my_rsvp: undefined },
  ],
  "2": [
    { id: "e3", title: "Répétition chorale", description: "Répétition pour le culte du dimanche", location: "Salle de répétition", event_date: new Date(Date.now()+2*86400000).toISOString(), rsvp_count: 18, my_rsvp: "going" },
  ],
};

const MOCK_PROJECTS: Record<string, Project[]> = {
  "1": [
    { id: "p1", title: "Camp de jeunesse 2025", description: "Organisation du camp annuel de jeunes", status: "en_cours", created_at: new Date(Date.now()-7*86400000).toISOString() },
    { id: "p2", title: "Évangélisation quartier Cadjehoun", description: "Planifier une semaine d'évangélisation", status: "planifie", created_at: new Date(Date.now()-14*86400000).toISOString() },
  ],
  "2": [
    { id: "p3", title: "Nouvelle partition Easter Sunday", description: "Apprendre les nouveaux cantiques", status: "en_cours", created_at: new Date().toISOString() },
  ],
};

const MOCK_POLLS: Record<string, Poll[]> = {
  "1": [
    {
      id: "pl1", question: "Quel jour préférez-vous pour la réunion de groupe ?",
      ends_at: new Date(Date.now()+5*86400000).toISOString(),
      my_vote: undefined,
      options: [
        { id: "o1", text: "Samedi après-midi", votes: 14 },
        { id: "o2", text: "Dimanche soir", votes: 8 },
        { id: "o3", text: "Vendredi soir", votes: 11 },
      ],
    },
    {
      id: "pl2", question: "Thème du prochain camp de jeunesse ?",
      ends_at: new Date(Date.now()+10*86400000).toISOString(),
      my_vote: "o5",
      options: [
        { id: "o4", text: "La foi qui déplace les montagnes", votes: 19 },
        { id: "o5", text: "Identité en Christ", votes: 22 },
        { id: "o6", text: "Le service et l'humilité", votes: 15 },
      ],
    },
  ],
};

// ============================================================
// COMPOSANT : LISTE DES GROUPES
// ============================================================
function GroupListView({ onSelect }: { onSelect: (g: Group) => void }) {
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const filtered = groups
    .filter(g => filter === "mine" ? g.is_member : true)
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const join = (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, is_member: true } : g));
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher un groupe..."
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-3"
      />

      {/* Filter tabs */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 mb-4">
        {[{ k: "mine", l: "Mes groupes" }, { k: "all", l: "Tous les groupes" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
              ${filter === f.k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {filtered.map(g => {
          const tc = typeConfig(g.type);
          return (
            <div key={g.id}
              className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => g.is_member && onSelect(g)}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: tc.bg }}>
                {g.icon_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground truncate">{g.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: tc.color, backgroundColor: tc.bg }}>
                    {tc.label}
                  </span>
                  {g.visibility === "prive" && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{g.member_count} membres</p>
              </div>
              <div className="flex-shrink-0">
                {g.is_member ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <button onClick={e => { e.stopPropagation(); join(g.id); }}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors">
                    Rejoindre
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Créer un groupe */}
      <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-colors">
        <Plus className="w-4 h-4" /> Créer un nouveau groupe
      </button>
    </div>
  );
}

// ============================================================
// COMPOSANT : ESPACE GROUPE (tabs internes)
// ============================================================
const GROUP_TABS = [
  { id: "chat",      label: "Chat",       icon: MessageCircle },
  { id: "events",    label: "Événements", icon: Calendar      },
  { id: "projects",  label: "Projets",    icon: Briefcase     },
  { id: "polls",     label: "Sondages",   icon: BarChart2     },
] as const;
type GroupTabId = (typeof GROUP_TABS)[number]["id"];

function GroupSpace({ group, onBack }: { group: Group; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<GroupTabId>("chat");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header groupe */}
      <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-xl">{group.icon_emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-foreground truncate">{group.name}</h2>
            <p className="text-[11px] text-muted-foreground">{group.member_count} membres</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Tabs internes */}
        <div className="max-w-lg mx-auto flex border-b border-border/30 overflow-x-auto">
          {GROUP_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap px-2
                  ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu tab */}
      <div className="max-w-lg mx-auto">
        {activeTab === "chat"     && <GroupChat     groupId={group.id} userId={user?.id} />}
        {activeTab === "events"   && <GroupEvents   groupId={group.id} userId={user?.id} />}
        {activeTab === "projects" && <GroupProjects groupId={group.id} />}
        {activeTab === "polls"    && <GroupPolls    groupId={group.id} userId={user?.id} />}
      </div>
    </div>
  );
}

// ============================================================
// CHAT DU GROUPE
// ============================================================
function GroupChat({ groupId, userId }: { groupId: string; userId?: string }) {
  const messages = MOCK_MESSAGES[groupId] || [];
  const [text, setText] = useState("");
  const [localMsgs, setLocalMsgs] = useState(messages);
  const [showPrayer, setShowPrayer] = useState(false);
  const [prayerText, setPrayerText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    setLocalMsgs(prev => [...prev, {
      id: Date.now().toString(), content: text, is_prayer: false,
      created_at: new Date().toISOString(), sender_id: userId || "me",
      profiles: { full_name: "Moi" },
    }]);
    setText("");
  };

  const sendPrayer = () => {
    if (!prayerText.trim()) return;
    setLocalMsgs(prev => [...prev, {
      id: Date.now().toString(), content: prayerText, is_prayer: true,
      created_at: new Date().toISOString(), sender_id: userId || "me",
      profiles: { full_name: "Moi" },
    }]);
    setPrayerText(""); setShowPrayer(false);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {localMsgs.map(msg => {
          const isMe = msg.sender_id === userId || msg.sender_id === "me";
          if (msg.is_prayer) {
            return (
              <div key={msg.id} className="mx-auto max-w-xs">
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🙏</span>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Sujet de prière</span>
                  </div>
                  <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-0.5">{msg.profiles.full_name}</p>
                  <p className="text-sm text-foreground italic">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-right">{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 self-end">
                  {getInitials(msg.profiles.full_name)}
                </div>
              )}
              <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && <p className="text-[10px] font-semibold text-primary mb-0.5 ml-1">{msg.profiles.full_name}</p>}
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "mr-1" : "ml-1"}`}>{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone prière */}
      {showPrayer && (
        <div className="px-4 pb-2 border-t border-border/30 bg-card pt-3">
          <p className="text-xs font-bold text-purple-600 mb-2">🙏 Partager un sujet de prière</p>
          <textarea value={prayerText} onChange={e => setPrayerText(e.target.value)}
            placeholder="Décris ton sujet de prière..."
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background outline-none resize-none"
            rows={2} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowPrayer(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground">Annuler</button>
            <button onClick={sendPrayer} className="flex-1 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold">Partager</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30 bg-card flex gap-2 items-center">
        <button onClick={() => setShowPrayer(true)}
          className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-base flex-shrink-0">
          🙏
        </button>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 px-3 py-2 rounded-full bg-muted text-sm outline-none border border-border focus:border-primary/40"
        />
        <button onClick={send}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">↑</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ÉVÉNEMENTS DU GROUPE
// ============================================================
function GroupEvents({ groupId, userId }: { groupId: string; userId?: string }) {
  const events = MOCK_EVENTS[groupId] || [];
  const [localEvents, setLocalEvents] = useState(events);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const rsvp = (eventId: string, status: string) => {
    setLocalEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, my_rsvp: status, rsvp_count: (e.rsvp_count || 0) + (e.my_rsvp ? 0 : 1) } : e
    ));
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    going:     { label: "Je viens ✓",   color: "#059669", bg: "#ECFDF5" },
    maybe:     { label: "Peut-être",    color: "#D97706", bg: "#FFFBEB" },
    not_going: { label: "Absent",       color: "#DC2626", bg: "#FEF2F2" },
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Événements du groupe</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Créer
        </button>
      </div>

      {/* Formulaire création */}
      {showNew && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nouvel événement</p>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de l'événement"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Lieu"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={() => {
              if (!newTitle || !newDate) return;
              setLocalEvents(prev => [...prev, { id: Date.now().toString(), title: newTitle, description: "", location: newLocation, event_date: newDate, rsvp_count: 0 }]);
              setNewTitle(""); setNewDate(""); setNewLocation(""); setShowNew(false);
            }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Liste événements */}
      {localEvents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="text-4xl mb-3">📅</span>
          <p className="font-semibold text-foreground">Aucun événement</p>
          <p className="text-sm text-muted-foreground mt-1">Crée le premier événement du groupe !</p>
        </div>
      ) : localEvents.map(ev => {
        const sc = ev.my_rsvp ? statusConfig[ev.my_rsvp] : null;
        return (
          <div key={ev.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-sm text-foreground">{ev.title}</h4>
              {sc && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">📅 {formatDate(ev.event_date)}</p>
            {ev.location && <p className="text-xs text-muted-foreground mb-3">📍 {ev.location}</p>}
            {ev.description && <p className="text-xs text-foreground mb-3">{ev.description}</p>}
            <p className="text-xs text-muted-foreground mb-3">{ev.rsvp_count} participant(s)</p>
            <div className="flex gap-2">
              {[
                { k: "going",     l: "Je viens ✓" },
                { k: "maybe",     l: "Peut-être"  },
                { k: "not_going", l: "Absent"     },
              ].map(s => (
                <button key={s.k} onClick={() => rsvp(ev.id, s.k)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                    ${ev.my_rsvp === s.k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PROJETS DU GROUPE
// ============================================================
function GroupProjects({ groupId }: { groupId: string }) {
  const projects = MOCK_PROJECTS[groupId] || [];
  const [localProjects, setLocalProjects] = useState(projects);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const statusConf: Record<string, { label: string; color: string; bg: string }> = {
    planifie:  { label: "Planifié",   color: "#2258B8", bg: "#EEF5FD" },
    en_cours:  { label: "En cours",   color: "#D97706", bg: "#FFFBEB" },
    termine:   { label: "Terminé ✓", color: "#059669", bg: "#ECFDF5" },
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Projets du groupe</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Nouveau
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nouveau projet</p>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du projet"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none resize-none" rows={2} />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={() => {
              if (!newTitle) return;
              setLocalProjects(prev => [...prev, { id: Date.now().toString(), title: newTitle, description: newDesc, status: "planifie", created_at: new Date().toISOString() }]);
              setNewTitle(""); setNewDesc(""); setShowNew(false);
            }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Créer</button>
          </div>
        </div>
      )}

      {localProjects.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="text-4xl mb-3">💼</span>
          <p className="font-semibold text-foreground">Aucun projet</p>
          <p className="text-sm text-muted-foreground mt-1">Lance le premier projet du groupe !</p>
        </div>
      ) : localProjects.map(p => {
        const sc = statusConf[p.status] || statusConf["planifie"];
        return (
          <div key={p.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
            </div>
            {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}
            <p className="text-[10px] text-muted-foreground">Créé {timeAgo(p.created_at)}</p>
            <div className="flex gap-2 mt-3">
              {["planifie", "en_cours", "termine"].map(s => {
                const c = statusConf[s];
                return (
                  <button key={s} onClick={() => setLocalProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: s } : pr))}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all
                      ${p.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// SONDAGES DU GROUPE
// ============================================================
function GroupPolls({ groupId, userId }: { groupId: string; userId?: string }) {
  const polls = MOCK_POLLS[groupId] || [];
  const [localPolls, setLocalPolls] = useState(polls);
  const [showNew, setShowNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  const vote = (pollId: string, optionId: string) => {
    setLocalPolls(prev => prev.map(p => {
      if (p.id !== pollId || p.my_vote) return p;
      return {
        ...p, my_vote: optionId,
        options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
      };
    }));
  };

  const addPoll = () => {
    const opts = newOptions.filter(o => o.trim());
    if (!newQuestion.trim() || opts.length < 2) return;
    setLocalPolls(prev => [...prev, {
      id: Date.now().toString(),
      question: newQuestion,
      ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      my_vote: undefined,
      options: opts.map((t, i) => ({ id: `new-${i}`, text: t, votes: 0 })),
    }]);
    setNewQuestion(""); setNewOptions(["", ""]); setShowNew(false);
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Sondages</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Créer
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nouveau sondage</p>
          <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
            placeholder="Question du sondage..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          <p className="text-xs text-muted-foreground font-medium">Options de réponse</p>
          {newOptions.map((opt, i) => (
            <input key={i} value={opt} onChange={e => setNewOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
              placeholder={`Option ${i + 1}`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
          ))}
          <button onClick={() => setNewOptions(prev => [...prev, ""])}
            className="text-xs text-primary font-semibold">+ Ajouter une option</button>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Annuler</button>
            <button onClick={addPoll} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Publier</button>
          </div>
        </div>
      )}

      {localPolls.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="text-4xl mb-3">📊</span>
          <p className="font-semibold text-foreground">Aucun sondage</p>
          <p className="text-sm text-muted-foreground mt-1">Lance un vote pour le groupe !</p>
        </div>
      ) : localPolls.map(poll => {
        const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
        const hasVoted = !!poll.my_vote;
        return (
          <div key={poll.id} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-sm text-foreground mb-1">{poll.question}</p>
            <p className="text-[10px] text-muted-foreground mb-4">
              {totalVotes} vote(s) · Expire {timeAgo(poll.ends_at)} restant
            </p>
            <div className="space-y-2">
              {poll.options.map(opt => {
                const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                const isMyVote = poll.my_vote === opt.id;
                return (
                  <button key={opt.id} onClick={() => vote(poll.id, opt.id)} disabled={hasVoted}
                    className={`w-full text-left rounded-xl border transition-all overflow-hidden
                      ${isMyVote ? "border-primary" : "border-border/50 hover:border-primary/30"}`}>
                    <div className="relative px-3 py-2.5">
                      {/* Barre de progression */}
                      {hasVoted && (
                        <div className="absolute inset-0 rounded-xl"
                          style={{ width: `${pct}%`, backgroundColor: isMyVote ? "rgba(26,75,155,0.12)" : "rgba(0,0,0,0.04)" }} />
                      )}
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isMyVote && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          <span className={`text-sm ${isMyVote ? "font-semibold text-primary" : "text-foreground"}`}>
                            {opt.text}
                          </span>
                        </div>
                        {hasVoted && (
                          <span className={`text-xs font-bold flex-shrink-0 ${isMyVote ? "text-primary" : "text-muted-foreground"}`}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!hasVoted && (
              <p className="text-[10px] text-muted-foreground text-center mt-3">Appuie sur une option pour voter</p>
            )}
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
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

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
    return <GroupSpace group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="font-bold text-xl text-foreground">Communauté</h1>
          <p className="text-xs text-muted-foreground">Clique sur un groupe pour l'ouvrir</p>
        </div>
      </header>
      <GroupListView onSelect={setSelectedGroup} />
    </div>
  );
}
