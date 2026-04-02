export interface Profile {
  full_name: string;
  role: "pasteur" | "diacre" | "admin" | "membre";
  avatar_initials: string;
  avatar_color: string;
}

export interface Comment {
  id: string;
  content: string;
  profiles: Profile;
}

export interface Post {
  id: string;
  created_at: string;
  content: string;
  type: "announcement" | "testimony" | "prayer" | "verse" | "post";
  is_official: boolean;
  is_pinned: boolean;
  media_url: string | null;
  profiles: Profile;
  reactions: { amen: number; feu: number; coeur: number };
  user_reactions: Record<string, boolean>;
  comments_count: number;
  comments: Comment[];
}

export const mockPosts: Post[] = [
  {
    id: "1",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    content: "Le culte de dimanche sera en plein air. Amenez vos chaises et votre joie !",
    type: "announcement",
    is_official: true,
    is_pinned: true,
    media_url: null,
    profiles: { full_name: "Pasteur Kokou", role: "pasteur", avatar_initials: "PK", avatar_color: "#1A4B9B" },
    reactions: { amen: 47, feu: 23, coeur: 61 },
    user_reactions: {},
    comments_count: 5,
    comments: [
      { id: "c1", content: "Gloire à Dieu ! On sera là en famille", profiles: { full_name: "Ama S.", role: "membre", avatar_initials: "AS", avatar_color: "#059669" } },
      { id: "c2", content: "Amen ! Que Dieu soit loué", profiles: { full_name: "Jonas K.", role: "membre", avatar_initials: "JK", avatar_color: "#D97706" } },
    ],
  },
  {
    id: "2",
    created_at: new Date(Date.now() - 18000000).toISOString(),
    content: "Après 3 mois de chômage, j'ai décroché mon poste aujourd'hui. Dieu est fidèle !",
    type: "testimony",
    is_official: false,
    is_pinned: false,
    media_url: null,
    profiles: { full_name: "Ama Sévi", role: "membre", avatar_initials: "AS", avatar_color: "#059669" },
    reactions: { amen: 128, feu: 0, coeur: 94 },
    user_reactions: {},
    comments_count: 3,
    comments: [
      { id: "c3", content: "Gloire à Dieu sœur !", profiles: { full_name: "Ruth D.", role: "membre", avatar_initials: "RD", avatar_color: "#7C3AED" } },
    ],
  },
  {
    id: "3",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    content: "Priez pour la guérison de Mère Marie, hospitalisée depuis lundi. Que Dieu intervienne.",
    type: "prayer",
    is_official: false,
    is_pinned: false,
    media_url: null,
    profiles: { full_name: "Diacre Abel", role: "diacre", avatar_initials: "DA", avatar_color: "#2258B8" },
    reactions: { amen: 56, feu: 0, coeur: 12 },
    user_reactions: {},
    comments_count: 0,
    comments: [],
  },
  {
    id: "4",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    content: "Verset du jour : \"Je peux tout par celui qui me fortifie.\" — Philippiens 4:13",
    type: "verse",
    is_official: true,
    is_pinned: false,
    media_url: null,
    profiles: { full_name: "MIREC Officiel", role: "admin", avatar_initials: "M", avatar_color: "#1A4B9B" },
    reactions: { amen: 203, feu: 87, coeur: 145 },
    user_reactions: {},
    comments_count: 7,
    comments: [],
  },
];

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export function typeConfig(type: Post["type"]) {
  switch (type) {
    case "prayer": return { label: "🙏 Prière", textClass: "text-mirec-purple", bgClass: "bg-purple-50" };
    case "testimony": return { label: "✨ Témoignage", textClass: "text-mirec-green", bgClass: "bg-emerald-50" };
    case "announcement": return { label: "📢 Annonce", textClass: "text-mirec-800", bgClass: "bg-mirec-50" };
    case "verse": return { label: "📖 Verset du jour", textClass: "text-mirec-amber", bgClass: "bg-amber-50" };
    default: return { label: "💬 Post", textClass: "text-muted-foreground", bgClass: "bg-muted" };
  }
}
