import { MirecLogo } from "@/components/mirec/MirecLogo";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 pb-20">
      <MirecLogo size={56} />
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">Cette section arrive bientôt !</p>
    </div>
  );
}
