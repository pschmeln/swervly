import { AnswerComposer } from "@/features/community/components/answer-composer";
import { ItemActions } from "@/features/community/components/item-actions";
import { timeAgo } from "@/features/community/rules";
import type { CommentView } from "@/features/community/server";

export const NO_NOTE_COMMENTS = "No comments yet.";

/** Comments under one shared review note (item 16). Same rules as Community: anonymous, 15-minute edits, Report. */
export function ReviewThread({ reviewId, comments, agreed }: { reviewId: string; comments: readonly CommentView[]; agreed: boolean }) {
  const now = new Date();
  return (
    <details className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-neutral-900">
        {comments.length === 0 ? "Comment" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
      </summary>
      <div className="grid gap-3 pb-2">
        {comments.length === 0 ? <p className="text-sm text-neutral-700">{NO_NOTE_COMMENTS}</p> : null}
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                {timeAgo(comment.createdAt, now)}
                {comment.editedAt ? " · edited" : ""}
                {comment.mine ? " · You" : ""}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-neutral-800">{comment.body}</p>
              <ItemActions target="comment" id={comment.id} helpfulCount={comment.helpfulCount} helpedByMe={comment.helpedByMe}
                mine={comment.mine} canEdit={comment.canEdit} agreed={agreed} body={comment.body} commentNoun="comment" />
            </li>
          ))}
        </ul>
        <AnswerComposer reviewId={reviewId} agreed={agreed} label="Your comment" submitLabel="Post comment" />
      </div>
    </details>
  );
}
