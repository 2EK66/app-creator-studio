import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { MirecAvatar } from "@/components/mirec/Avatar";
import {
  MessageCircle, ArrowLeft, Send, Search, X,
  Check, CheckCheck, Paperclip, File as FileIcon, Download, Users,
  Mic, Trash2, Play, Pause
} from "lucide-react";
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
  attachment_url?: string | null;
  attachment_type?: string | null;
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
// MODAL APERÇU PIÈCE JOINTE
// ============================================================
function AttachmentPreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
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
      <img src={url} alt="Aperçu" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
      <p className="text-white/40 text-xs mt-6">Appuie n'importe où pour fermer</p>
    </div>
  );
}

// ============================================================
// INDICATEUR "EN TRAIN D'ÉCRIRE..."
// ============================================================
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2 mt-1">
      <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
      <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <style>{`
          @keyframes typing-dot {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground pb-1">{name} écrit…</span>
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
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const typingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activePartner, setActivePartner]   = useState<{ id: string; name: string; avatarUrl?: string | null } | null>(null);
  const [messages, setMessages]             = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage]         = useState("");
  const [sending, setSending]               = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<any[]>([]);
  const [showSearch, setShowSearch]         = useState(false);
  const [photoModal, setPhotoModal]         = useState<{ url: string | null; name: string; initials: string } | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline]   = useState(false);
  const [partnerTyping, setPartnerTyping]   = useState(false);
  const [activeTab, setActiveTab]           = useState<"messages" | "contacts">("messages");
  const [allMembers, setAllMembers]         = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ---- Enregistrement vocal ----
  const MAX_VOICE_SEC = 180; // 3 minutes
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef  = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordCancelledRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);

  // ---- Utilitaire avatar ----
  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("avatars").getPublicUrl(path).data?.publicUrl || null;
  };

  // ---- Charger tous les membres (onglet Contacts) ----
  const fetchAllMembers = useCallback(async () => {
    if (!user) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, role")
        .neq("id", user.id)
        .order("full_name", { ascending: true })
        .limit(100);
      if (error) throw error;
      setAllMembers(
        (data || []).map(p => ({ ...p, avatar_url: getAvatarUrl(p.avatar_url) }))
      );
    } catch (err) {
      console.error("Erreur chargement contacts:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "contacts") fetchAllMembers();
  }, [activeTab, fetchAllMembers]);

  // ---- Typing ----
  const emitTyping = useCallback(() => {
    if (!user || !activePartner) return;
    supabase.channel(`typing-${activePartner.id}`)
      .send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [user, activePartner]);

  useEffect(() => {
    if (!user || !activePartner) return;
    const ch = supabase
      .channel(`typing-${user.id}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== activePartner.id) return;
        setPartnerTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setPartnerTyping(false), 2000);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [user, activePartner]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    emitTyping();
  };

  // ---- Upload & envoi ----
  const uploadAttachment = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user || !activePartner) return null;
    const fileExt = file.name.split('.').pop();
    const isImage = file.type.startsWith('image/');
    const filePath = `${user.id}/${activePartner.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('message_attachments').upload(filePath, file);
    if (uploadError) { alert("Erreur lors de l'envoi du fichier"); return null; }
    const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
    return { url: urlData.publicUrl, type: isImage ? 'image' : 'file' };
  };

  const sendDM = async (attachment?: { url: string; type: string }) => {
    if ((!newMessage.trim() && !attachment) || !user || !activePartner || sending) return;
    setSending(true);
    const tempMsg: DirectMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim() || (attachment?.type === 'image' ? '📷 Image' : '📎 Fichier'),
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: activePartner.id,
      is_read: false,
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");
    if (attachment && attachment.type === 'image') setUploading(false);
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, receiver_id: activePartner.id, content: tempMsg.content, attachment_url: attachment?.url || null, attachment_type: attachment?.type || null })
      .select().single();
    if (!error && data) setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
    else setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    setSending(false);
    fetchConversations();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Le fichier ne doit pas dépasser 10 Mo"); return; }
    setUploading(true);
    const attachment = await uploadAttachment(file);
    if (attachment) await sendDM(attachment);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
  };

  // ---- Vocal: démarrer / arrêter / annuler ----
  const startRecording = async () => {
    if (recording || !user || !activePartner) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr: MediaRecorder = new (window as any).MediaRecorder(stream, { mimeType: mime });
      recordChunksRef.current = [];
      recordCancelledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const wasCancelled = recordCancelledRef.current;
        const chunks = recordChunksRef.current;
        setRecording(false);
        setRecordSec(0);
        if (wasCancelled || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mime });
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });
        setUploading(true);
        const filePath = `${user.id}/${activePartner.id}/voice-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('message_attachments').upload(filePath, file, { contentType: mime });
        if (upErr) { alert("Erreur lors de l'envoi du vocal"); setUploading(false); return; }
        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
        await sendDM({ url: urlData.publicUrl, type: 'audio' });
        setUploading(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSec(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSec(prev => {
          if (prev + 1 >= MAX_VOICE_SEC) {
            try { mediaRecorderRef.current?.stop(); } catch {}
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("micro:", err);
      alert("Impossible d'accéder au micro. Autorise l'accès dans ton navigateur.");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    recordCancelledRef.current = false;
    try { mediaRecorderRef.current?.stop(); } catch {}
  };

  const cancelRecording = () => {
    if (!recording) return;
    recordCancelledRef.current = true;
    try { mediaRecorderRef.current?.stop(); } catch {}
  };

  // ---- Marquer comme lu ----
  const markAsRead = useCallback(async (partnerId: string) => {
    if (!user) return;
    await supabase.from("direct_messages").update({ is_read: true })
      .eq("sender_id", partnerId).eq("receiver_id", user.id).eq("is_read", false);
  }, [user]);

  // ---- Ouvrir conversation ----
  const openConversation = useCallback(async (
    partnerId: string, partnerName: string, partnerAvatarUrl: string | null = null
  ) => {
    if (!user) return;
    setActivePartner({ id: partnerId, name: partnerName, avatarUrl: partnerAvatarUrl });
    setActiveTab("messages");
    const { data } = await supabase
      .from("direct_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    await markAsRead(partnerId);
  }, [user, markAsRead]);

  // ---- Realtime messages ----
  useEffect(() => {
    if (!user || !activePartner) return;
    const channel = supabase.channel(`dm-${user.id}-${activePartner.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.sender_id !== activePartner.id) return;
          setMessages(prev => [...prev, msg]);
          await markAsRead(activePartner.id);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as DirectMessage;
          if (updated.is_read) setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: true } : m));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activePartner, markAsRead]);

  // ---- Présence ----
  useEffect(() => {
    if (!user || !activePartner) return;
    const presence = supabase.channel(`presence-${activePartner.id}`)
      .on("presence", { event: "sync" }, () => {
        setPartnerOnline(Object.keys(presence.presenceState()).length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presence.track({ user_id: user.id });
      });
    return () => { supabase.removeChannel(presence); };
  }, [user, activePartner]);

  // ---- InitialState ----
  useEffect(() => {
    if (!user || !initialState?.openConversationWith) return;
    const avatar = initialState.avatarUrl ? getAvatarUrl(initialState.avatarUrl) : null;
    openConversation(initialState.openConversationWith, initialState.userName || "Utilisateur", avatar);
  }, [user, initialState?.openConversationWith, openConversation]);

  // ---- Scroll auto ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // ---- Charger conversations ----
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: msgs } = await supabase.from("direct_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false });
    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return; }
    const partnerMap = new Map<string, typeof msgs>();
    msgs.forEach(m => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!partnerMap.has(pid)) partnerMap.set(pid, []);
      partnerMap.get(pid)!.push(m);
    });
    const partnerIds = [...partnerMap.keys()];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", partnerIds);
    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, { name: p.full_name || "Anonyme", avatar: getAvatarUrl(p.avatar_url) }])
    );
    const convos: Conversation[] = partnerIds.map(pid => {
      const pMsgs = partnerMap.get(pid)!;
      const last  = pMsgs[0];
      const prof  = profileMap[pid] || { name: "Anonyme", avatar: null };
      return {
        partner_id: pid, partner_name: prof.name,
        partner_initials: prof.name.slice(0, 2).toUpperCase(),
        partner_avatar_url: prof.avatar,
        last_message: last.content, last_time: last.created_at || "",
        unread: pMsgs.filter(m => m.receiver_id === user.id && !m.is_read).length,
      };
    });
    setConversations(convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()));
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchConversations(); }, [user, fetchConversations]);

  // ---- Recherche ----
  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).neq("id", user?.id || "").limit(10);
    setSearchResults((data || []).map(p => ({ ...p, avatar_url: getAvatarUrl(p.avatar_url) })));
  };

  const startConversation = (p: any) => {
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
    openConversation(p.id, p.full_name || "Anonyme", p.avatar_url || null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso); const diff = Date.now() - d.getTime();
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

  // ============================================================
  // VUE CONVERSATION
  // ============================================================
  if (activePartner) {
    const partnerInitials = activePartner.name.slice(0, 2).toUpperCase();

    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => { setActivePartner(null); fetchConversations(); }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
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
              <div className="flex items-center gap-1">
                {partnerTyping ? (
                  <span className="text-[10px] text-primary font-medium animate-pulse">
                    en train d'écrire...
                  </span>
                ) : (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    <span className="text-[10px] text-muted-foreground">
                      {partnerOnline ? "En ligne" : "Hors ligne"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

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
            const showTime = !prevMsg ||
              (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${isNewGroup ? "mt-2" : "mt-0.5"}`}>
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

                  <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}
                      style={isMe ? {
                        background: "linear-gradient(135deg, #1A4B9B, #7C3AED)",
                        color: "#fff",
                        boxShadow: "0 2px 12px rgba(26,75,155,0.35)",
                      } : {
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      }}
                    >
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <button onClick={() => setPreviewAttachment(msg.attachment_url!)} className="block mb-1">
                          <img src={msg.attachment_url} alt="pièce jointe" className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                        </button>
                      )}
                      {msg.attachment_url && msg.attachment_type === 'file' && (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm bg-black/10 rounded-lg px-3 py-2 mb-1 no-underline">
                          <File className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Fichier joint</span>
                          <Download className="w-3 h-3 flex-shrink-0" />
                        </a>
                      )}
                      {msg.content && <p className="text-sm leading-relaxed break-words">{msg.content}</p>}
                    </div>

                    {isMe && (
                      <div className="flex items-center gap-1 mt-0.5 justify-end">
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

          {partnerTyping && <TypingIndicator name={activePartner.name.split(" ")[0]} />}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-20 bg-card border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex gap-2 items-center">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx,.txt,.mp3,.mp4" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center transition-colors disabled:opacity-50">
              {uploading
                ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Paperclip className="w-4 h-4" />
              }
            </button>
            <input
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDM(); } }}
              placeholder={`Message à ${activePartner.name}...`}
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={() => sendDM()} disabled={(!newMessage.trim() && !uploading) || sending}
              className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1A4B9B, #7C3AED)", boxShadow: "0 2px 8px rgba(26,75,155,0.4)" }}>
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {photoModal && <PhotoModal avatarUrl={photoModal.url} name={photoModal.name} initials={photoModal.initials} onClose={() => setPhotoModal(null)} />}
        {previewAttachment && <AttachmentPreviewModal url={previewAttachment} onClose={() => setPreviewAttachment(null)} />}
      </div>
    );
  }

  // ============================================================
  // LISTE PRINCIPALE — onglets Messages / Contacts
  // ============================================================
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
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

        {/* ONGLETS */}
        <div className="max-w-lg mx-auto flex gap-1 mt-2">
          {[
            { key: "messages", label: "Conversations", icon: MessageCircle },
            { key: "contacts", label: "Contacts",      icon: Users         },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "text-white"
                  : "text-muted-foreground bg-muted/50"
              }`}
              style={activeTab === tab.key ? {
                background: "linear-gradient(135deg, #1A4B9B, #7C3AED)",
                boxShadow: "0 2px 8px rgba(26,75,155,0.3)",
              } : {}}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
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

      {/* ONGLET CONVERSATIONS */}
      {activeTab === "messages" && (
        <div className="max-w-lg mx-auto px-4 py-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="font-semibold text-foreground text-sm">Aucune conversation</p>
              <p className="text-xs text-muted-foreground mt-1">Va dans Contacts pour démarrer un chat !</p>
              <button onClick={() => setActiveTab("contacts")}
                className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #1A4B9B, #7C3AED)" }}>
                Voir les contacts
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
                  <p className={`text-sm truncate ${convo.unread > 0 ? "font-bold" : "font-semibold"} text-foreground`}>
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
      )}

      {/* ONGLET CONTACTS — avec skeleton loader et compteur corrigé */}
      {activeTab === "contacts" && (
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Compteur conditionnel : "Chargement..." tant que loadingMembers est true */}
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            {loadingMembers
              ? "Chargement des membres..."
              : `${allMembers.length} membre${allMembers.length !== 1 ? "s" : ""} dans la communauté`
            }
          </p>

          {loadingMembers ? (
            // Skeleton loader (5 lignes)
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : allMembers.length === 0 ? (
            // Message si aucun autre membre
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun autre membre pour l’instant.
            </div>
          ) : (
            <div className="space-y-1">
              {allMembers.map(member => (
                <button key={member.id}
                  onClick={() => openConversation(member.id, member.full_name || "Membre", member.avatar_url)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors group">
                  <MirecAvatar
                    initials={(member.full_name || "?").slice(0, 2).toUpperCase()}
                    color="hsl(220 70% 35%)" size={46}
                    url={member.avatar_url}
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{member.full_name || "Membre"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {member.username && <span className="text-[11px] text-muted-foreground">@{member.username}</span>}
                      {member.role && member.role !== "membre" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {member.role === "pasteur" ? "⛪" : member.role === "diacre" ? "🤝" : "🛡"} {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-full text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #1A4B9B, #7C3AED)" }}>
                    Message
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
