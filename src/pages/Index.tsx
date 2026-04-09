import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed        from "@/pages/Feed";
import Groups      from "@/pages/Groups";
import Messages    from "@/pages/Messages";
import Louange     from "@/pages/Louange";
import Marketplace from "@/pages/Marketplace";
import Profile     from "@/pages/Profile";

export default function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");
  const [inboxState, setInboxState] = useState<{ openConversationWith?: string; userName?: string; avatarUrl?: string | null }>({});

  // Détecter une navigation avec état (ex: depuis Feed)
  useEffect(() => {
    const state = location.state as any;
    if (state?.tab) {
      setActiveTab(state.tab);
      if (state.tab === "inbox" && state.openConversationWith) {
        setInboxState({
          openConversationWith: state.openConversationWith,
          userName: state.userName,
          avatarUrl: state.avatarUrl,
        });
      }
      // Nettoyer l'état de l'URL pour éviter de le réappliquer au re-render
      navigate("/", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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
          key={JSON.stringify(inboxState)}
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
