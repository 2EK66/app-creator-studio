import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MirecAvatarProps {
  initials: string;
  color?: string;       // optionnel, valeur par défaut "hsl(220 70% 35%)"
  size?: number;        // optionnel, 40 par défaut
  url?: string | null;  // optionnel, pour l'avatar image
}

export function MirecAvatar({ initials, color, size = 40, url }: MirecAvatarProps) {
  return (
    <Avatar style={{ width: size, height: size }}>
      {url && <AvatarImage src={url} alt="Profil" className="object-cover" />}
      <AvatarFallback 
        style={{ backgroundColor: color || "hsl(220 70% 35%)" }}
        className="text-white font-bold flex items-center justify-center"
      >
        {initials.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
