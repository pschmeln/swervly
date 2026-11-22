import Link from "next/link";
import { Card } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { POST_KIND_LABELS, timeAgo } from "@/features/community/rules";
import type { PostSummary } from "@/features/community/server";
import { ROUTES } from "@/lib/constants";

export const NO_POSTS = "No posts here yet. Ask the first question or share what you learned on a co-op.";
export const DELETED_POST = "The author deleted this post. The answers below are kept.";
export const HIDDEN_NOTE = "Hidden from students. Only founders can see this.";

export function excerpt(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function PostTags({ tags }: { tags: PostSummary["tags"] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
      {tags.map((tag) => (
        <li key={`${tag.kind}:${tag.label}`} className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-700">
          {tag.label}
        </li>
      ))}
    </ul>
  );
}

/** One post in the list. No author is ever shown; "You" marks the viewer's own posts. */
export function PostCard({ post, now }: { post: PostSummary; now: Date }) {
  const href = ROUTES.communityPost.replace("[id]", post.id);
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        {POST_KIND_LABELS[post.kind as keyof typeof POST_KIND_LABELS] ?? "Post"} · {timeAgo(post.createdAt, now)}
        {post.mine ? " · You" : ""}
      </p>
      <h3 className="mt-1 break-words text-base font-semibold">
        <Link href={href} className={`inline-flex min-h-12 items-center underline-offset-2 hover:underline ${focusRing}`}>
          {post.title}
        </Link>
      </h3>
      {post.body ? <p className="break-words text-neutral-800">{excerpt(post.body)}</p> : null}
      <PostTags tags={post.tags} />
      <p className="mt-2 text-sm text-neutral-600">
        {post.answerCount} {post.answerCount === 1 ? "answer" : "answers"} · {post.helpfulCount} found this helpful
      </p>
    </Card>
  );
}
