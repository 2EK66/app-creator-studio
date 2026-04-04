import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MirecLogo } from "@/components/mirec/MirecLogo";
import { Users, Calendar, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GroupList } from "@/components/mirec/GroupList";
import { EventList } from "@/components/mirec/EventList";
import { ProjectList } from "@/components/mirec/ProjectList";

const tabs = [
  { id: "groups", label: "Groupes", icon: Users },
  { id: "events", label: "Événements", icon: Calendar },
  { id: "projects", label: "Projets", icon: Briefcase },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("groups");

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <MirecLogo size={48} />
        <p className="text-muted-foreground text-sm text-center">Connecte-toi pour accéder aux groupes</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="font-display text-xl font-bold text-foreground">Communauté</h1>
        </div>
        <div className="max-w-lg mx-auto flex border-b border-border/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {activeTab === "groups" && <GroupList />}
        {activeTab === "events" && <EventList />}
        {activeTab === "projects" && <ProjectList />}
      </div>
    </div>
  );
}
