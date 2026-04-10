import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import { MessageCircle, ArrowLeft, Send, Search, X, ImagePlus, Paperclip, Download, FileText } from "lucide-react";
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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
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
// MODAL IMAGE PLEIN ÉCRAN
// ============================================================
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
      <img
        src={src}
        alt="Image"
        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <p className="text-white/40 text-xs mt-4">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// MODAL PHOTO AVATAR
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
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
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
// BULLE DE MESSAGE
// ============================================================
function MessageBubble({ msg, isMe, onImageClick }: {
  msg: DirectMessage; isMe: boolean; onImageClick: (url: string) => void;
}) {
  const isImage = msg.file_type?.startsWith("image/");
  const hasFile = !!msg.file_url;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] space-y-1.5`}>
        {/* Image en ligne */}
        {hasFile && isImage && (
          <div
            className={`rounded-2xl overflow-hidden cursor-pointer border border-white/10 ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}
            onClick={() => onImageClick(msg.file_url!)}
          >
            <img src={msg.file_url!} alt={msg.file_name || "Image"} className="max-w-[260px] max-h-64 object-cover hover:opacity-90 transition-opacity" />
          </div>
        )}

        {/* Fichier téléchargeable */}
        {hasFile && !isImage && (
          <a
            href={msg.file_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border no-underline transition-colors ${
              isMe
                ? "bg-primary/90 text-primary-foreground border-primary/40 hover:bg-primary rounded-br-md"
                : "bg-muted text-foreground border-border hover:bg-muted/70 rounded-bl-md"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-primary/10"}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate max-w-[140px]">{msg.file_name || "Fichier"}</p>
              <p className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Appuie pour ouvrir</p>
            </div>
            <Download className="w-4 h-4 opacity-70 flex-shrink-0" />
          </a>
        )}

        {/* Texte */}
        {msg.content && (
          <div className={`rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
            <p className="text-sm">{msg.content}</p>
            <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {new Date(msg.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {/* Heure si pas de texte */}
        {!msg.content && hasFile && (
          <p className={`text-[9px] px-1 ${isMe ? "text-right text-muted-foreground" : "text-muted-foreground"}`}>
            {new Date(msg.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function Messages({ initialState = {}, onTabChange }: MessagesProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activePartner, setActivePartner] = useState<{
    id: string; name: string; avatarUrl?: string | null;
  } | null>(null);
  const [messages, setMessages]           = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage]       = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch]       = useState(false);
  const [photoModal, setPhotoModal]       = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [imageModal, setImageModal]       = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);

  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
  };

  const openConversation = async (partnerId: string, partnerName: string, partnerAvatarUrl: string | null = null) => {
    if (!user) return;
    setActivePartner({ id: partnerId, name: partnerName, avatarUrl: partnerAvatarUrl });

    const { data } = await supabase
      .from("direct_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages((data || []) as DirectMessage[]);

    await supabase.from("direct_messages").update({ is_read: true })
      .eq("sender_id", partnerId).eq("receiver_id", user.id).eq("is_read", false);
  };

  useEffect(() => {
    if (!user || !initialState?.openConversationWith) return;
    const partnerId  = initialState.openConversationWith;
    const partnerName = initialState.userName || "Utilisateur";
    const avatar     = initialState.avatarUrl ? getAvatarUrl(initialState.avatarUrl) : null;
    openConversation(partnerId, partnerName, avatar);
  }, [user, initialState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
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
    const { data: profiles } = await supabase.from("profiles")
      .select("id, full_name, avatar_url").in("id", partnerIds);
    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, { name: p.full_name || "Anonyme", avatar: getAvatarUrl(p.avatar_url) }])
    );

    const convos: Conversation[] = partnerIds.map(pid => {
      const pMsgs = partnerMap.get(pid)!;
      const last  = pMsgs[0] as any;
      const prof  = profileMap[pid] || { name: "Anonyme", avatar: null };
      let preview = last.content || "";
      if (!preview && last.file_type?.startsWith("image/")) preview = "🖼️ Photo";
      else if (!preview && last.file_url) preview = "📎 Fichier";
      return {
        partner_id: pid,
        partner_name: prof.name,
        partner_initials: prof.name.slice(0, 2).toUpperCase(),
        partner_avatar_url: prof.avatar,
        last_message: preview,
        last_time: last.created_at || "",
        unread: pMsgs.filter((m: any) => m.receiver_id === user.id && !m.is_read).length,
      };
    });

    setConversations(convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()));
    setLoading(false);
  };

  useEffect(() => { if (user) fetchConversations(); }, [user]);

  // Envoie un message texte
  const sendDM = async () => {
    if (!newMessage.trim() || !user || !activePartner) return;
    const tempMsg: DirectMessage = {
      id: crypto.randomUUID(),
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: activePartner.id,
      is_read: false,
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");
    await supabase.from("direct_messages").insert({
      sender_id: user.id, receiver_id: activePartner.id, content: tempMsg.content,
    });
    fetchConversations();
  };

  // Envoie un fichier ou une photo
  const sendFile = async (file: File) => {
    if (!user || !activePartner) return;
    setUploading(true);
    try {
      const ext    = file.name.split(".").pop();
      const path   = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dm-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("dm-files").getPublicUrl(path);
      const fileUrl = urlData.publicUrl;

      const tempMsg: DirectMessage = {
        id: crypto.randomUUID(),
        content: "",
        created_at: new Date().toISOString(),
        sender_id: user.id,
        receiver_id: activePartner.id,
        is_read: false,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
      };
      setMessages(prev => [...prev, tempMsg]);

      // Try saving with file fields, fallback without if columns don't exist
      const { error: insertErr } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: activePartner.id,
        content: "",
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
      });

      if (insertErr) {
        // Fallback: save just the URL as content text
        await supabase.from("direct_messages").insert({
          sender_id: user.id,
          receiver_id: activePartner.id,
          content: fileUrl,
        });
      }
      fetchConversations();
    } catch (err) {
      console.error("Erreur envoi fichier:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendFile(file);
    e.target.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendFile(file);
    e.target.value = "";
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from("profiles")
      .select("id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("id", user?.id || "").limit(10);
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder aux messages</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Se connecter</button>
      </div>
    );
  }

  // ── Vue conversation ──────────────────────────────────────
  if (activePartner) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => { setActivePartner(null); fetchConversations(); }} className="p-1.5 rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => setPhotoModal({ url: activePartner.avatarUrl || null, name: activePartner.name, initials: activePartner.name.slice(0, 2).toUpperCase() })}
              className="flex-shrink-0 rounded-full overflow-hidden hover:scale-105 transition-transform"
              style={{ width: 36, height: 36 }}
            >
              {activePartner.avatarUrl
                ? <img src={activePartner.avatarUrl} alt={activePartner.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(220 70% 35%)" }}>
                    <span className="text-white font-bold text-sm">{activePartner.name.slice(0, 2).toUpperCase()}</span>
                  </div>
              }
            </button>
            <p className="font-bold text-base text-foreground flex-1 truncate">{activePartner.name}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">Commence la conversation avec {activePartner.name} !</p>
          )}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.sender_id === user.id}
              onImageClick={setImageModal}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Barre d'envoi */}
        <div className="sticky bottom-20 bg-card border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto space-y-2">
            {uploading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Envoi en cours…</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* Bouton photo */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <ImagePlus className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </button>

              {/* Bouton fichier */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>

              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendDM()}
                placeholder="Écrire un message…"
                className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={sendDM}
                disabled={!newMessage.trim() || uploading}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Inputs fichier cachés */}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        <input ref={fileInputRef}  type="file" accept="*/*"     onChange={handleFileChange}  className="hidden" />

        {photoModal && (
          <PhotoModal avatarUrl={photoModal.url} name={photoModal.name} initials={photoModal.initials} onClose={() => setPhotoModal(null)} />
        )}
        {imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}
      </div>
    );
  }

  // ── Liste des conversations ───────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full hover:bg-muted">
            <Search className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <input
            value={searchQuery}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-2 bg-card rounded-xl border border-border/50 overflow-hidden">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => startConversation(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 border-b border-border/30 last:border-0">
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
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 && !showSearch ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Aucune conversation</p>
            <button onClick={() => setShowSearch(true)} className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              Nouveau message
            </button>
          </div>
        ) : conversations.map(convo => (
          <button key={convo.partner_id}
            onClick={() => openConversation(convo.partner_id, convo.partner_name, convo.partner_avatar_url || null)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors">
            <div className="relative">
              <MirecAvatar initials={convo.partner_initials} color="hsl(220 70% 35%)" size={48} url={convo.partner_avatar_url} />
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
        ))}
      </div>
    </div>
  );
}
