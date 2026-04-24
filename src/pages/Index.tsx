import { useState, useEffect } from "react";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed        from "@/pages/Feed";
import Groups      from "@/pages/Groups";
import Messages    from "@/pages/Messages";
import Louange     from "@/pages/Louange";
import Marketplace from "@/pages/Marketplace";
import Profile     from "@/pages/Profile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("feed");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [inboxState, setInboxState] = useState<{
    openConversationWith?: string;
    userName?: string;
    avatarUrl?: string | null;
  }>({});

  const handleTabChange = (tab: string, state?: Record<string, any>) => {
    if (tab === "inbox" && state) {
      setInboxState(state as any);
      // Dès qu'on ouvre la messagerie, on remet le badge à 0
      // (Tu peux aussi marquer les messages comme lus ici si besoin)
      setUnreadMessages(0);
    } else {
      setInboxState({});
    }
    setActiveTab(tab);
  };

  // ✅ Compteur réel des messages non lus (basé sur read_at IS NULL)
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);   // non lu = read_at NULL

      if (!error && count !== null) {
        setUnreadMessages(count);
      }
    };

    fetchUnreadCount();

    // 🔁 Écoute en temps réel
    const channel = supabase
      .channel("realtime:direct_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          // Nouveau message non lu ? on incrémente
          if (newMessage.read_at === null) {
            setUnreadMessages((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          // Si read_at passe de NULL à une valeur (message devient lu)
          if (old.read_at === null && updated.read_at !== null) {
            setUnreadMessages((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {activeTab === "feed"        && <Feed onTabChange={handleTabChange} />}
      {activeTab === "groupes"     && <Groups />}
      {activeTab === "inbox"       && (
        <Messages
          key={JSON.stringify(inboxState)}
          initialState={inboxState}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === "louange"     && <Louange />}
      {activeTab === "marketplace" && <Marketplace />}
      {activeTab === "profil"      && <Profile />}

      <BottomTabs 
        active={activeTab} 
        onChange={handleTabChange}
        unreadMessages={unreadMessages}   // ← Le badge est bien passé
      />
    </div>
  );
}
