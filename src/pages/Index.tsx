import { useState } from "react";
import { BottomTabs } from "@/components/mirec/BottomTabs";
import Feed from "./Feed";
import Profile from "./Profile";
import Groups from "./Groups";
import Messages from "./Messages";
import Placeholder from "./Placeholder";

export default function Index() {
  const [tab, setTab] = useState("feed");

  return (
    <div className="max-w-screen overflow-x-hidden">
      {tab === "feed" && <Feed />}
      {tab === "groupes" && <Groups />}
      {tab === "inbox" && <Messages />}
      {tab === "louange" && <Placeholder title="Louange" />}
      {tab === "profil" && <Profile />}
      <BottomTabs active={tab} onChange={setTab} />
    </div>
  );
}
