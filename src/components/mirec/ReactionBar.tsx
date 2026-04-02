import type { Post } from "@/lib/mockData";

const reactions = [
  { key: "amen" as const, emoji: "🙏", label: "Amen" },
  { key: "feu" as const, emoji: "🔥", label: "" },
  { key: "coeur" as const, emoji: "❤️", label: "" },
];

interface Props {
  post: Post;
  onReact: (postId: string, key: "amen" | "feu" | "coeur") => void;
}

export function ReactionBar({ post, onReact }: Props) {
  return (
    <div className="flex gap-2 pt-1">
      {reactions.map((r) => {
        const active = post.user_reactions?.[r.key];
        const count = post.reactions?.[r.key] || 0;
        return (
          <button
            key={r.key}
            onClick={() => onReact(post.id, r.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              active
                ? "bg-mirec-50 text-mirec-800 font-semibold ring-1 ring-mirec-200"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span>{r.emoji}</span>
            {r.label && <span>{r.label}</span>}
            {count > 0 && <span className="text-xs opacity-70">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
