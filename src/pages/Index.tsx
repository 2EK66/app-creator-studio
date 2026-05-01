import { useState, useEffect } from "react";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed from "@/pages/Feed";
import Groups from "@/pages/Groups";
import Messages from "@/pages/Messages";
import Louange from "@/pages/Louange";
import Marketplace from "@/pages/Marketplace";
import Profile from "@/pages/Profile";
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
      setUnreadMessages(0);
    } else {
      setInboxState({});
    }
    setActiveTab(tab);
  };

  // ---- Compteur messages non lus (temps réel) ----
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      if (!error && count !== null) setUnreadMessages(count);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel(`unread-index-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.is_read === false) setUnreadMessages((prev) => prev + 1);
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
          const old = payload.old as any;
          const updated = payload.new as any;
          if (old.is_read === false && updated.is_read === true) {
            setUnreadMessages((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Re-fetch quand on ouvre l'onglet Messages (laisse le temps de marquer comme lus)
  useEffect(() => {
    if (activeTab !== "inbox" || !user) return;
    const timeout = setTimeout(async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setUnreadMessages(count || 0);
    }, 1800);
    return () => clearTimeout(timeout);
  }, [activeTab, user]);

  return (
    <div className="min-h-screen bg-background">
      {activeTab === "feed" && <Feed onTabChange={handleTabChange} />}
      {activeTab === "groupes" && <Groups />}
      {activeTab === "inbox" && (
        <Messages
          key={JSON.stringify(inboxState)}
          initialState={inboxState}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === "louange" && <Louange />}
      {activeTab === "marketplace" && <Marketplace />}
      {activeTab === "profil" && <Profile />}

      <BottomTabs
        active={activeTab}
        onChange={handleTabChange}
        unreadMessages={unreadMessages}
      />
    </div>
  );
}
