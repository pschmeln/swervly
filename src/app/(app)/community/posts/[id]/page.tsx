import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, PageShell } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { AnswerComposer } from "@/features/community/components/answer-composer";
import { ItemActions } from "@/features/community/components/item-actions";
import { DELETED_POST, HIDDEN_NOTE, PostTags } from "@/features/community/components/post-card";
import { hasCommunityTerms, POST_KIND_LABELS, timeAgo } from "@/features/community/rules";
import { getPost } from "@/features/community/server";
import { requireOnboardedUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Community post" };

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireOnboardedUser(), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  const founder = isFounderEmail(user.email);
  const post = await getPost(user, id, { founder });
  if (!post) notFound();
  const agreed = hasCommunityTerms(user);
  const now = new Date();

  return (
    <PageShell title="Community">
      <p>
        <Link href={ROUTES.community} className={`inline-flex min-h-12 items-center font-medium underline ${focusRing}`}>
          Back to Community
        </Link>
      </p>
      <Card>
        {post.deleted ? (
          <p className="text-neutral-700">{DELETED_POST}</p>
        ) : (
          <>
            {post.hidden ? <p className="mb-2 text-sm font-semibold text-neutral-800">{HIDDEN_NOTE}</p> : null}
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              {POST_KIND_LABELS[post.kind as keyof typeof POST_KIND_LABELS] ?? "Post"} · {timeAgo(post.createdAt, now)}
              {post.editedAt ? " · edited" : ""}
              {post.mine ? " · You" : ""}
            </p>
            <h2 className="mt-1 break-words font-serif text-2xl font-normal leading-tight">{post.title}</h2>
            {post.body ? <p className="mt-2 whitespace-pre-line break-words text-neutral-800">{post.body}</p> : null}
            <PostTags tags={post.tags} />
            {post.hidden ? null : <ItemActions target="post" id={post.id} helpfulCount={post.helpfulCount} helpedByMe={post.helpedByMe} mine={post.mine}
              canEdit={post.canEdit} agreed={agreed} title={post.title} body={post.body} afterDelete={ROUTES.community} />}
          </>
        )}
      </Card>

      <section aria-labelledby="answers-heading" className="grid gap-3">
        <h2 id="answers-heading" className="text-lg font-semibold">
          {post.answerCount} {post.answerCount === 1 ? "answer" : "answers"}
        </h2>
        {post.answerCount === 0 && !post.deleted ? <p className="text-neutral-700">No answers yet. If you know, help out.</p> : null}
        <ul className="grid gap-3">
          {post.comments.map((comment) => (
            <li key={comment.id}>
              <Card>
                {comment.hidden ? <p className="mb-2 text-sm font-semibold text-neutral-800">{HIDDEN_NOTE}</p> : null}
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                  {timeAgo(comment.createdAt, now)}
                  {comment.editedAt ? " · edited" : ""}
                  {comment.mine ? " · You" : ""}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-neutral-800">{comment.body}</p>
                {comment.hidden ? null : <ItemActions target="comment" id={comment.id} helpfulCount={comment.helpfulCount} helpedByMe={comment.helpedByMe}
                  mine={comment.mine} canEdit={comment.canEdit} agreed={agreed} body={comment.body} />}
              </Card>
            </li>
          ))}
        </ul>
        {post.deleted || post.hidden ? null : (
          <Card>
            <AnswerComposer postId={post.id} agreed={agreed} />
          </Card>
        )}
      </section>
    </PageShell>
  );
}
