import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { MessageCircle, ArrowLeft, Send, Search, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// ============================================================
// TYPES
// ============================================================
interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_initials: string;
  partner_avatar_url?: string | null;
  last_message: string;
  last_time: string;
  unread: number;
}

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
}

// ============================================================
// MODAL PHOTO EN GRAND
// ============================================================
function PhotoModal({ avatarUrl, name, initials, onClose }: { avatarUrl: string | null; name: string; initials: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
        <X className="w-5 h-5 text-white" />
      </button>
      <p className="text-white font-semibold text-base mb-4 opacity-90">{name}</p>
      <div className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl" style={{ width: 240, height: 240 }} onClick={e => e.stopPropagation()}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
            <span className="text-white font-bold" style={{ fontSize: 80 }}>{initials}</span>
          </div>
        )}
      </div>
      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// MODAL PROFIL UTILISATEUR (version simplifiée pour messages)
// ============================================================
function UserProfileModal({ userId, name, initials, avatarUrl, onClose, onViewPhoto }: {
  userId: string; name: string; initials: string; avatarUrl: string | null;
  onClose: () => void; onViewPhoto: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    supabase.from("profiles").select("full_name, username, points_total, streak_days, role, quartier").eq("id", userId).single()
      .then(({ data }) => { if (data) setProfile(data); });
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId)
      .then(({ count }) => { if (count !== null) setPostCount(count); });
    (supabase.from("member_skills" as any).select("skill, level").eq("profile_id", userId).limit(5) as any)
      .then(({ data }: any) => { if (data) setSkills(data); });
  }, [userId]);

  const LEVELS = [
    { name: "Nouveau croyant", min: 0, max: 200, icon: "🌱" },
    { name: "Disciple", min: 200, max: 600, icon: "📖" },
    { name: "Serviteur", min: 600, max: 1500, icon: "🙏" },
    { name: "Évangéliste", min: 1500, max: 3000, icon: "📣" },
    { name: "Ancien", min: 3000, max: 6000, icon: "⭐" },
    { name: "Prophète", min: 6000, max: 99999, icon: "🏆" },
  ];
  const pts = profile?.points_total || 0;
  const level = LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[LEVELS.length - 1];
  const SKILL_COLORS: Record<string, string> = { debutant: "#6B7280", intermediaire: "#D97706", avance: "#059669", expert: "#1A4B9B", professionnel: "#7C3AED" };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl overflow-hidden" style={{ maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/30">
          <button onClick={onViewPhoto} className="flex-shrink-0 rounded-full overflow-hidden border-3 border-primary/20 hover:border-primary/60" style={{ width: 64, height: 64 }}>
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
            }
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground">{name}</h3>
            {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
            {profile?.role && profile.role !== "membre" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{profile.role === "pasteur" ? "⛪ Pasteur" : profile.role === "diacre" ? "🤝 Diacre" : profile.role}</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border/30">
          <div className="text-center"><p className="font-bold text-lg text-foreground">{postCount}</p><p className="text-[10px] text-muted-foreground">Posts</p></div>
          <div className="text-center"><p className="font-bold text-lg text-foreground">{pts}</p><p className="text-[10px] text-muted-foreground">Points</p></div>
          <div className="text-center"><p className="font-bold text-lg text-foreground">{profile?.streak_days || 0}🔥</p><p className="text-[10px] text-muted-foreground">Streak</p></div>
        </div>
        <div className="px-5 py-3 border-b border-border/30"><div className="flex items-center gap-2"><span className="text-xl">{level.icon}</span><div><p className="text-sm font-semibold text-foreground">{level.name}</p><p className="text-[10px] text-muted-foreground">{pts} points</p></div></div></div>
        {profile?.quartier && <div className="px-5 py-3 border-b border-border/30"><p className="text-xs text-muted-foreground">📍 {profile.quartier}</p></div>}
        {skills.length > 0 && <div className="px-5 py-3 border-b border-border/30"><p className="text-xs font-semibold text-muted-foreground mb-2">💼 Compétences</p><div className="flex flex-wrap gap-2">{skills.map((s: any, i: number) => <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: SKILL_COLORS[s.level] || "#6B7280", backgroundColor: (SKILL_COLORS[s.level] || "#6B7280") + "18" }}>{s.skill}</span>)}</div></div>}
        <div className="px-5 py-4"><button onClick={() => { navigate("/messages", { state: { openConversationWith: userId, userName: name } }); onClose(); }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">💬 Envoyer un message</button></div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL MESSAGES
// ============================================================
export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePartner, setActivePartner] = useState<{ id: string; name: string; avatarUrl?: string | null } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; username: string | null; avatar_url?: string | null }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  // Modals
  const [photoModal, setPhotoModal] = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [profileModal, setProfileModal] = useState<{ userId: string; name: string; initials: string; avatar: string | null } | null>(null);

  // Fonction helper pour récupérer l'URL d'avatar
  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
  };

  // Ouvrir une conversation (avec mise à jour des messages et des avatars)
  const openConversation = async (partnerId: string, partnerName: string, partnerAvatarUrl: string | null = null) => {
    if (!user) return;
    setActivePartner({ id: partnerId, name: partnerName, avatarUrl: partnerAvatarUrl });

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  // Récupérer les conversations
  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return; }

    const partnerMap = new Map<string, { msgs: typeof msgs }>();
    msgs.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { msgs: [] });
      partnerMap.get(partnerId)!.msgs.push(m);
    });

    const partnerIds = [...partnerMap.keys()];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", partnerIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, { name: p.full_name || "Anonyme", avatar: getAvatarUrl(p.avatar_url) }]));

    const convos: Conversation[] = partnerIds.map((pid) => {
      const pMsgs = partnerMap.get(pid)!.msgs;
      const last = pMsgs[0];
      const profile = profileMap[pid] || { name: "Anonyme", avatar: null };
      return {
        partner_id: pid,
        partner_name: profile.name,
        partner_initials: profile.name.slice(0, 2).toUpperCase(),
        partner_avatar_url: profile.avatar,
        last_message: last.content,
        last_time: last.created_at || "",
        unread: pMsgs.filter((m) => m.receiver_id === user.id && !m.is_read).length,
      };
    });

    setConversations(convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()));
    setLoading(false);
  };

  // Navigation depuis l'état (lien direct depuis Feed)
  useEffect(() => {
    if (!user) return;
    const state = location.state as { openConversationWith?: string; userName?: string } | null;
    if (state?.openConversationWith) {
      const partnerId = state.openConversationWith;
      const partnerName = state.userName || "Utilisateur";
      // Récupérer l'avatar du partenaire
      supabase.from("profiles").select("avatar_url").eq("id", partnerId).single()
        .then(({ data }) => {
          const avatarUrl = getAvatarUrl(data?.avatar_url || null);
          openConversation(partnerId, partnerName, avatarUrl);
        })
        .catch(() => openConversation(partnerId, partnerName, null));
      // Nettoyer l'état pour ne pas le réappliquer au re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [user, location]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const sendDM = async () => {
    if (!newMessage.trim() || !user || !activePartner) return;
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activePartner.id,
      content: newMessage.trim(),
    });
    if (!error) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        sender_id: user.id,
        receiver_id: activePartner.id,
        is_read: false,
      }]);
      setNewMessage("");
      // Mettre à jour la conversation en arrière-plan
      fetchConversations();
    }
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("id", user?.id || "")
      .limit(10);
    setSearchResults((data || []).map(p => ({ ...p, avatar_url: getAvatarUrl(p.avatar_url) })));
  };

  const startConversation = (profile: { id: string; full_name: string | null; avatar_url?: string | null }) => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    openConversation(profile.id, profile.full_name || "Anonyme", profile.avatar_url || null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("fr", { weekday: "short" });
    return d.toLocaleDateString("fr", { day: "numeric", month: "short" });
  };

  // Ouvrir la photo du partenaire actif
  const openPartnerPhoto = () => {
    if (!activePartner) return;
    setPhotoModal({
      url: activePartner.avatarUrl || null,
      name: activePartner.name,
      initials: activePartner.name.slice(0, 2).toUpperCase(),
    });
  };

  const openPartnerProfile = () => {
    if (!activePartner) return;
    setProfileModal({
      userId: activePartner.id,
      name: activePartner.name,
      initials: activePartner.name.slice(0, 2).toUpperCase(),
      avatar: activePartner.avatarUrl || null,
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder aux messages</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          Se connecter
        </button>
      </div>
    );
  }

  // Vue de la conversation
  if (activePartner) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => { setActivePartner(null); fetchConversations(); }} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={openPartnerPhoto} className="focus:outline-none">
              <MirecAvatar
                initials={activePartner.name.slice(0, 2).toUpperCase()}
                color="hsl(220 70% 35%)"
                size={36}
                url={activePartner.avatarUrl}
              />
            </button>
            <button onClick={openPartnerProfile} className="font-display text-base font-bold text-foreground hover:underline">
              {activePartner.name}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">Commence la conversation !</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                  isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at!).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-20 bg-card border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendDM()}
              placeholder="Écrire un message..."
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={sendDM} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modals */}
        {photoModal && (
          <PhotoModal
            avatarUrl={photoModal.url}
            name={photoModal.name}
            initials={photoModal.initials}
            onClose={() => setPhotoModal(null)}
          />
        )}
        {profileModal && (
          <UserProfileModal
            userId={profileModal.userId}
            name={profileModal.name}
            initials={profileModal.initials}
            avatarUrl={profileModal.avatar}
            onClose={() => setProfileModal(null)}
            onViewPhoto={() => {
              setPhotoModal({ url: profileModal.avatar, name: profileModal.name, initials: profileModal.initials });
              setProfileModal(null);
            }}
          />
        )}
      </div>
    );
  }

  // Liste des conversations
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Search className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <input
            value={searchQuery}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-2 bg-card rounded-xl border border-border/50 overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startConversation(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
                >
                  <MirecAvatar initials={(p.full_name || "?").slice(0, 2).toUpperCase()} color="hsl(220 70% 35%)" size={36} url={p.avatar_url} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                    {p.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-1">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-12">Chargement...</p>
        ) : conversations.length === 0 && !showSearch ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Aucune conversation</p>
            <button onClick={() => setShowSearch(true)} className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              Nouveau message
            </button>
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.partner_id}
              onClick={() => openConversation(convo.partner_id, convo.partner_name, convo.partner_avatar_url)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors"
            >
              <div className="relative">
                <MirecAvatar
                  initials={convo.partner_initials}
                  color="hsl(220 70% 35%)"
                  size={48}
                  url={convo.partner_avatar_url}
                />
                {convo.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {convo.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">{convo.partner_name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(convo.last_time)}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${convo.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {convo.last_message}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
