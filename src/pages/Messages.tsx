import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { MessageCircle, ArrowLeft, Send, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_initials: string;
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

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePartner, setActivePartner] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; username: string | null }[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return; }

    // Group by partner
    const partnerMap = new Map<string, { msgs: typeof msgs }>();
    msgs.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { msgs: [] });
      partnerMap.get(partnerId)!.msgs.push(m);
    });

    const partnerIds = [...partnerMap.keys()];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", partnerIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name || "Anonyme"]));

    const convos: Conversation[] = partnerIds.map((pid) => {
      const pMsgs = partnerMap.get(pid)!.msgs;
      const last = pMsgs[0];
      const name = profileMap[pid] || "Anonyme";
      return {
        partner_id: pid,
        partner_name: name,
        partner_initials: name.slice(0, 2).toUpperCase(),
        last_message: last.content,
        last_time: last.created_at || "",
        unread: pMsgs.filter((m) => m.receiver_id === user.id && !m.is_read).length,
      };
    });

    setConversations(convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()));
    setLoading(false);
  };

  const openConversation = async (partnerId: string, partnerName: string) => {
    if (!user) return;
    setActivePartner({ id: partnerId, name: partnerName });

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Mark as read
    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

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
    }
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
  };

  const startConversation = (profile: { id: string; full_name: string | null }) => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    openConversation(profile.id, profile.full_name || "Anonyme");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("fr", { weekday: "short" });
    return d.toLocaleDateString("fr", { day: "numeric", month: "short" });
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

  // Chat view
  if (activePartner) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => { setActivePartner(null); fetchConversations(); }} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <MirecAvatar initials={activePartner.name.slice(0, 2).toUpperCase()} color="hsl(220 70% 35%)" size={36} />
            <h2 className="font-display text-base font-bold text-foreground">{activePartner.name}</h2>
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
      </div>
    );
  }

  // Conversations list
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

      {/* Search */}
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
                  <MirecAvatar initials={(p.full_name || "?").slice(0, 2).toUpperCase()} color="hsl(220 70% 35%)" size={36} />
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
              onClick={() => openConversation(convo.partner_id, convo.partner_name)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors"
            >
              <div className="relative">
                <MirecAvatar initials={convo.partner_initials} color="hsl(220 70% 35%)" size={48} />
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
