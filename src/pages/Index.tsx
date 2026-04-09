import { useState } from "react";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed        from "@/pages/Feed";
import Groups      from "@/pages/Groups";
import Messages    from "@/pages/Messages";
import Louange     from "@/pages/Louange";
import Marketplace from "@/pages/Marketplace";
import Profile     from "@/pages/Profile";

export default function Index() {
  const [activeTab, setActiveTab] = useState("feed");
  const [inboxState, setInboxState] = useState<{
    openConversationWith?: string;
    userName?: string;
    avatarUrl?: string | null;
  }>({});

  const handleTabChange = (tab: string, state?: Record<string, any>) => {
    if (tab === "inbox" && state) {
      setInboxState(state as any);
    } else {
      setInboxState({});
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background">
      {activeTab === "feed"        && <Feed        onTabChange={handleTabChange} />}
      {activeTab === "groupes"     && <Groups />}
      {activeTab === "inbox"       && (
        <Messages
          key={JSON.stringify(inboxState)} // force re‑mount si l'état change
          initialState={inboxState}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === "louange"     && <Louange />}
      {activeTab === "marketplace" && <Marketplace />}
      {activeTab === "profil"      && <Profile />}

      <BottomTabs active={activeTab} onChange={handleTabChange} />
    </div>
  );
}
