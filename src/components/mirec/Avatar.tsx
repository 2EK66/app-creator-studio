import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MirecAvatarProps {
  initials: string;
  color?: string;
  size?: number;
  url?: string | null;
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
