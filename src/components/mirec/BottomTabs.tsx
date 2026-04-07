import { Newspaper, Users, MessageCircle, Music, Store, User} from "lucide-react";

const tabs = [
  { key: "feed", label: "Feed", icon: Newspaper },
  { key: "groupes", label: "Groupes", icon: Users },
  { key: "inbox", label: "Messages", icon: MessageCircle },
  { key: "louange", label: "Louange", icon: Music },
  { key: "marketplace", label: "Market", icon: Store }, 
  { key: "profil", label: "Profil", icon: User },
];

interface Props {
  active: string;
  onChange: (tab: string) => void;
}

export function BottomTabs({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-40 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
