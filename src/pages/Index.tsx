import { useState } from "react";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed        from "@/pages/Feed";
import Groups      from "@/pages/Groups";
import Messages    from "@/pages/Messages";
import Louange     from "@/pages/Louange";
import Marketplace from "@/pages/Marketplace";
import Profile     from "@/pages/Profile";

// ============================================================
// État partagé pour ouvrir directement une conversation
// depuis le Feed (fiche profil → "Envoyer un message")
// ============================================================
interface InboxState {
  openConversationWith?: string;
  userName?: string;
  avatarUrl?: string | null;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState("feed");
  const [inboxState, setInboxState] = useState<InboxState>({});

  // Appelé par Feed (et autres pages) pour changer d'onglet
  // avec un état optionnel (ex: ouvrir une conversation)
  const handleTabChange = (tab: string, state?: Record<string, any>) => {
    if (tab === "inbox" && state) {
      setInboxState(state as InboxState);
    } else {
      setInboxState({});
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* PAGE ACTIVE */}
      {activeTab === "feed"        && <Feed        onTabChange={handleTabChange} />}
      {activeTab === "groupes"     && <Groups />}
      {activeTab === "inbox"       && (
        <Messages
          key={JSON.stringify(inboxState)} // force re-mount si état change
          initialState={inboxState}
          onTabChange={handleTabChange}
        />
      )}
      {activeTab === "louange"     && <Louange />}
      {activeTab === "marketplace" && <Marketplace />}
      {activeTab === "profil"      && <Profile />}

      {/* BARRE DE NAVIGATION */}
      <BottomTabs active={activeTab} onChange={handleTabChange} />
    </div>
  );
}
