import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, ArrowLeft, Send, Lock, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  sender_name?: string;
}

export function GroupList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupVisibility, setNewGroupVisibility] = useState("public");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchGroups(); }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
    const { data: groupsData } = await supabase.from("groups").select("*");
    if (!groupsData) { setLoading(false); return; }
    const { data: members } = await supabase.from("group_members").select("group_id, profile_id");
    const enriched: Group[] = groupsData.map((g) => ({
      ...g,
      member_count: members?.filter((m) => m.group_id === g.id).length || 0,
      is_member: !!members?.find((m) => m.group_id === g.id && m.profile_id === user?.id),
    }));
    setGroups(enriched);
    setLoading(false);
  };

  const joinGroup = async (groupId: string) => {
    if (!user) { navigate("/auth"); return; }
    await supabase.from("group_members").insert({ group_id: groupId, profile_id: user.id });
    fetchGroups();
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("profile_id", user.id);
    fetchGroups();
    if (activeGroup?.id === groupId) setActiveGroup(null);
  };

  const openGroup = async (group: Group) => {
    if (!group.is_member) return;
    setActiveGroup(group);
    const { data: msgs } = await supabase
      .from("group_messages").select("*").eq("group_id", group.id)
      .order("created_at", { ascending: true });
    if (msgs) {
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", senderIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name || "Anonyme"]));
      setMessages(msgs.map((m) => ({ ...m, sender_name: profileMap[m.sender_id] || "Anonyme" })));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !activeGroup) return;
    const { error } = await supabase.from("group_messages").insert({
      group_id: activeGroup.id, sender_id: user.id, content: newMessage.trim(),
    });
    if (!error) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), content: newMessage.trim(),
        created_at: new Date().toISOString(), sender_id: user.id, sender_name: "Moi",
      }]);
      setNewMessage("");
    }
  };

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("groups").insert({
      name: newGroupName.trim(), visibility: newGroupVisibility, created_by: user.id,
    }).select().single();
    if (data && !error) {
      await supabase.from("group_members").insert({ group_id: data.id, profile_id: user.id });
      setNewGroupName(""); setShowCreate(false); fetchGroups();
    }
    setCreating(false);
  };

  if (activeGroup) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <button onClick={() => setActiveGroup(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">{activeGroup.name}</h2>
            <p className="text-[11px] text-muted-foreground">{activeGroup.member_count} membre{activeGroup.member_count > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">Aucun message encore. Sois le premier !</p>}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                  {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at!).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border/50 px-4 py-3">
          <div className="flex gap-2">
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Écrire un message..."
              className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex justify-end mb-2">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
          <Plus className="w-4 h-4" /> Créer
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground">Créer un groupe</h3>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nom du groupe"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="flex gap-2">
              <button onClick={() => setNewGroupVisibility("public")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${newGroupVisibility === "public" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Globe className="w-4 h-4" /> Public
              </button>
              <button onClick={() => setNewGroupVisibility("private")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${newGroupVisibility === "private" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Lock className="w-4 h-4" /> Privé
              </button>
            </div>
            <button onClick={createGroup} disabled={creating || !newGroupName.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-12">Chargement...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun groupe pour l'instant</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openGroup(group)}>
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {group.visibility === "private" ? <Lock className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{group.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{group.member_count} membre{group.member_count > 1 ? "s" : ""}{group.visibility === "private" && " · Privé"}</p>
                </div>
              </div>
              {group.is_member ? (
                <button onClick={() => leaveGroup(group.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  Quitter
                </button>
              ) : (
                <button onClick={() => joinGroup(group.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground">
                  Rejoindre
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
