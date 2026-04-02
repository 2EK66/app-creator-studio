interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export function MirecAvatar({ initials, color, size = 40 }: AvatarProps) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
