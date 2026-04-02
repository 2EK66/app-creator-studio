import { MirecAvatar } from "./Avatar";
import { ReactionBar } from "./ReactionBar";
import { CommentSection } from "./CommentSection";
import { timeAgo, typeConfig, type Post } from "@/lib/mockData";
import { Pin, Shield } from "lucide-react";

interface Props {
  post: Post;
  onReact: (postId: string, key: "amen" | "feu" | "coeur") => void;
  onAddComment: (postId: string, text: string) => void;
}

export function PostCard({ post, onReact, onAddComment }: Props) {
  const tc = typeConfig(post.type);

  return (
    <div className={`bg-card rounded-2xl p-5 shadow-sm border border-border/50 space-y-3 ${post.is_pinned ? "ring-1 ring-mirec-200" : ""}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <MirecAvatar initials={post.profiles.avatar_initials} color={post.profiles.avatar_color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{post.profiles.full_name}</span>
            {post.profiles.role === "pasteur" && (
              <Shield className="w-3.5 h-3.5 text-mirec-800" />
            )}
            {post.is_pinned && (
              <Pin className="w-3.5 h-3.5 text-mirec-amber" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{timeAgo(post.created_at)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tc.bgClass} ${tc.textClass}`}>
              {tc.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed ${post.type === "verse" ? "font-display italic text-base" : ""}`}>
        {post.content}
      </p>

      {/* Reactions */}
      <ReactionBar post={post} onReact={onReact} />

      {/* Comments */}
      <CommentSection post={post} onAddComment={onAddComment} />
    </div>
  );
}
