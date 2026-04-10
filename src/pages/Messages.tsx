import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { MessageCircle, ArrowLeft, Send, Search, X, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface MessagesProps {
  initialState?: {
    openConversationWith?: string;
    userName?: string;
    avatarUrl?: string | null;
  };
  onTabChange?: (tab: string, state?: Record<string, any>) => void;
}

// ============================================================
// INDICATEUR DE LECTURE
// — ✓ gris  = envoyé mais pas lu
// — ✓✓ bleu = lu par le destinataire
// ============================================================
function ReadReceipt({ isRead, isMe }: { isRead: boolean; isMe: boolean }) {
  if (!isMe) return null;
  return isRead ? (
    <CheckCheck className="w-3 h-3 text-blue-400 inline-block ml-1 flex-shrink-0" />
  ) : (
    <Check className="w-3 h-3 text-primary-foreground/50 inline-block ml-1 flex-shrink-0" />
  );
}

// ============================================================
// MODAL PHOTO
// ============================================================
function PhotoModal({ avatarUrl, name, initials, onClose }: {
  avatarUrl: string | null; name: string; initials: string; onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
      <p className="text-white font-semibold text-base mb-4 opacity-90">{name}</p>
      <div className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl" style={{ width: 240, height: 240 }} onClick={e => e.stopPropagation()}>
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
              <span className="text-white font-bold" style={{ fontSize: 80 }}>{initials}</span>
            </div>
        }
      </div>
      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function Messages({ initialState = {}, onTabChange }: MessagesProps) {
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activePartner, setActivePartner] = useState<{
    id: string; name: string; avatarUrl?: string | null;
  } | null>(null);
  const [messages, setMessages]     = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // ---- Utilitaire avatar ----
  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
  };

  // ============================================================
  // MARQUER COMME LU — appelé dès qu'on ouvre une conversation
  // ============================================================
  const markAsRead = useCallback(async (partnerId: string) => {
    if (!user) return;
    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  }, [user]);

  // ============================================================
  // OUVRIR UNE CONVERSATION
  // ============================================================
  const openConversation = useCallback(async (
    partnerId: string,
    partnerName: string,
    partnerAvatarUrl: string | null = null
  ) => {
    if (!user) return;
    setActivePartner({ id: partnerId, name: partnerName, avatarUrl: partnerAvatarUrl });

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Marquer les messages reçus comme lus
    await markAsRead(partnerId);
  }, [user, markAsRead]);

  // ============================================================
  // REALTIME — écoute les nouveaux messages + mises à jour is_read
  // ============================================================
  useEffect(() => {
    if (!user || !activePartner) return;

    const channel = supabase
      .channel(`dm-${user.id}-${activePartner.id}`)

      // Nouveau message reçu
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const msg = payload.new as DirectMessage;
        if (msg.sender_id !== activePartner.id) return;
        setMessages(prev => [...prev, msg]);
        // Marquer immédiatement comme lu puisqu'on est dans la conversation
        await markAsRead(activePartner.id);
      })

      // is_read mis à jour → mettre à jour l'état local
      // (quand le destinataire lit nos messages)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "direct_messages",
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as DirectMessage;
        if (updated.is_read) {
          setMessages(prev =>
            prev.map(m => m.id === updated.id ? { ...m, is_read: true } : m)
          );
        }
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activePartner, markAsRead]);

  // ============================================================
  // REALTIME PRÉSENCE — voir si le partenaire est en ligne
  // (optionnel, désactiver si la table presence n'existe pas)
  // ============================================================
  useEffect(() => {
    if (!user || !activePartner) return;

    const presence = supabase.channel(`presence-${activePartner.id}`)
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        setPartnerOnline(Object.keys(state).length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presence); };
  }, [user, activePartner]);

  // ============================================================
  // INITIALSTATE — ouvrir directement depuis le Feed
  // ============================================================
  useEffect(() => {
    if (!user) return;
    if (initialState?.openConversationWith) {
      const partnerId   = initialState.openConversationWith;
      const partnerName = initialState.userName || "Utilisateur";
      const avatar      = initialState.avatarUrl ? getAvatarUrl(initialState.avatarUrl) : null;
      openConversation(partnerId, partnerName, avatar);
    }
  }, [user, initialState?.openConversationWith]);

  // ============================================================
  // SCROLL AUTO EN BAS
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================
  // CHARGER LES CONVERSATIONS
  // ============================================================
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: msgs } = await supabase
      .from("direct_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return; }

    const partnerMap = new Map<string, typeof msgs>();
    msgs.forEach(m => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!partnerMap.has(pid)) partnerMap.set(pid, []);
      partnerMap.get(pid)!.push(m);
    });

    const partnerIds = [...partnerMap.keys()];
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, avatar_url").in("id", partnerIds);
    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, { name: p.full_name || "Anonyme", avatar: getAvatarUrl(p.avatar_url) }])
    );

    const convos: Conversation[] = partnerIds.map(pid => {
      const pMsgs = partnerMap.get(pid)!;
      const last  = pMsgs[0];
      const prof  = profileMap[pid] || { name: "Anonyme", avatar: null };
      return {
        partner_id:         pid,
        partner_name:       prof.name,
        partner_initials:   prof.name.slice(0, 2).toUpperCase(),
        partner_avatar_url: prof.avatar,
        last_message:       last.content,
        last_time:          last.created_at || "",
        unread:             pMsgs.filter(m => m.receiver_id === user.id && !m.is_read).length,
      };
    });

    setConversations(convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()));
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchConversations(); }, [user, fetchConversations]);

  // ============================================================
  // ENVOYER UN MESSAGE
  // ============================================================
  const sendDM = async () => {
    if (!newMessage.trim() || !user || !activePartner || sending) return;
    setSending(true);

    const tempMsg: DirectMessage = {
      id:          `temp-${Date.now()}`,
      content:     newMessage.trim(),
      created_at:  new Date().toISOString(),
      sender_id:   user.id,
      receiver_id: activePartner.id,
      is_read:     false,
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, receiver_id: activePartner.id, content: tempMsg.content })
      .select()
      .single();

    if (!error && data) {
      // Remplacer le message temporaire par le vrai
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
    }

    setSending(false);
    fetchConversations();
  };

  // ============================================================
  // RECHERCHE MEMBRES
  // ============================================================
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

  const startConversation = (p: any) => {
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
    openConversation(p.id, p.full_name || "Anonyme", p.avatar_url || null);
  };

  const formatTime = (iso: string) => {
    const d    = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000)  return d.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("fr", { weekday: "short" });
    return d.toLocaleDateString("fr", { day: "numeric", month: "short" });
  };

  // ---- Non connecté ----
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder aux messages</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Se connecter</button>
      </div>
    );
  }

  // ============================================================
  // VUE CONVERSATION
  // ============================================================
  if (activePartner) {
    const partnerInitials = activePartner.name.slice(0, 2).toUpperCase();

    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">

        {/* Header conversation */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => { setActivePartner(null); fetchConversations(); }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            {/* Avatar partenaire → photo en grand */}
            <button
              onClick={() => setPhotoModal({ url: activePartner.avatarUrl || null, name: activePartner.name, initials: partnerInitials })}
              className="flex-shrink-0 rounded-full overflow-hidden hover:scale-105 transition-all focus:outline-none"
              style={{ width: 38, height: 38 }}>
              {activePartner.avatarUrl
                ? <img src={activePartner.avatarUrl} alt={activePartner.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                    <span className="text-white font-bold text-sm">{partnerInitials}</span>
                  </div>
              }
            </button>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{activePartner.name}</p>
              {/* Indicateur en ligne */}
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <span className="text-[10px] text-muted-foreground">
                  {partnerOnline ? "En ligne" : "Hors ligne"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8 text-primary/50" />
              </div>
              <p className="font-semibold text-foreground text-sm">Commence la conversation</p>
              <p className="text-xs text-muted-foreground mt-1">Dis bonjour à {activePartner.name} 👋</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMe      = msg.sender_id === user.id;
            const prevMsg   = index > 0 ? messages[index - 1] : null;
            const isNewGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;

            // Afficher l'heure seulement si > 5 min depuis le msg précédent
            const showTime = !prevMsg ||
              (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {/* Séparateur de temps */}
                {showTime && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${isNewGroup ? "mt-2" : "mt-0.5"}`}>

                  {/* Avatar partenaire (gauche) */}
                  {!isMe && isNewGroup && (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-0.5"
                      style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                      {activePartner.avatarUrl
                        ? <img src={activePartner.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white font-bold text-[8px] flex items-center justify-center w-full h-full">{partnerInitials}</span>
                      }
                    </div>
                  )}
                  {!isMe && !isNewGroup && <div className="w-6 flex-shrink-0" />}

                  {/* Bulle de message */}
                  <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                    }`}>
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    </div>

                    {/* Statut lecture — affiché seulement pour nos messages */}
                    {isMe && (
                      <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        {msg.is_read ? (
                          <div className="flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3 text-blue-400" />
                            <span className="text-[9px] text-blue-400 font-medium">Lu</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[9px] text-muted-foreground/50">Envoyé</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Zone saisie */}
        <div className="sticky bottom-20 bg-card border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex gap-2 items-center">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDM(); } }}
              placeholder={`Message à ${activePartner.name}...`}
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={sendDM}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0">
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Modal photo */}
        {photoModal && (
          <PhotoModal avatarUrl={photoModal.url} name={photoModal.name} initials={photoModal.initials} onClose={() => setPhotoModal(null)} />
        )}
      </div>
    );
  }

  // ============================================================
  // LISTE DES CONVERSATIONS
  // ============================================================
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
            {/* Badge total non lus */}
            {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                {conversations.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Search className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {/* Recherche */}
      {showSearch && (
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <input value={searchQuery} onChange={e => searchUsers(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus />
          {searchResults.length > 0 && (
            <div className="mt-2 bg-card rounded-xl border border-border/50 overflow-hidden shadow-lg">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => startConversation(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0">
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

      {/* Liste conversations */}
      <div className="max-w-lg mx-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 && !showSearch ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="font-semibold text-foreground text-sm">Aucune conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Envoie le premier message à un membre !</p>
            <button onClick={() => setShowSearch(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Nouveau message
            </button>
          </div>
        ) : conversations.map(convo => (
          <button key={convo.partner_id}
            onClick={() => openConversation(convo.partner_id, convo.partner_name, convo.partner_avatar_url || null)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors">
            <div className="relative flex-shrink-0">
              <MirecAvatar initials={convo.partner_initials} color="hsl(220 70% 35%)" size={48} url={convo.partner_avatar_url} />
              {convo.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                  {convo.unread > 9 ? "9+" : convo.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-sm truncate ${convo.unread > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                  {convo.partner_name}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(convo.last_time)}</span>
              </div>
              <p className={`text-xs truncate ${convo.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {convo.last_message}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
