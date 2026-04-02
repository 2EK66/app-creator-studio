export function MirecLogo({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-mirec-800 to-mirec-900 flex items-center justify-center shadow-lg"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 40 40" fill="none">
        <path d="M20 6C13 6 8 12 8 18c0 8 12 16 12 16s12-8 12-16c0-6-5-12-12-12z" fill="white" fillOpacity="0.9" />
        <path d="M20 12v12M14 18h12" stroke="hsl(220 70% 35%)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
