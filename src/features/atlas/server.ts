import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { PREFERENCE_QUESTIONS, type QuestionAnswer } from "@/content/atlas/questions";
import { db } from "@/db";
import { careerAtlasAnswers, careerAtlasMarks } from "@/db/schema";
import { atlasGraph } from "@/features/atlas/graph";
import { levelOf, type AtlasNodeId } from "@/features/atlas/types";

/**
 * Saved Career Atlas choices (Stage D). Every query is scoped to the signed-in
 * student's id, which callers take from apiOnboardedUser(), never the request.
 */

export const MARK_VALUES = ["interested", "dismissed", "pursuing"] as const;
export type MarkValue = (typeof MARK_VALUES)[number];

export type SavedAtlasState = {
  /** False when the tables aren't there yet (migration not applied) or the read failed. */
  available: boolean;
  interested: AtlasNodeId[];
  dismissed: AtlasNodeId[];
  pursuing: AtlasNodeId | null;
  answers: Record<string, QuestionAnswer>;
};

const EMPTY: SavedAtlasState = { available: false, interested: [], dismissed: [], pursuing: null, answers: {} };

function isMarkable(nodeId: string): boolean {
  const level = levelOf(nodeId);
  return level !== null && level !== "domain" && atlasGraph().nodes.has(nodeId as AtlasNodeId);
}

export const MarkInput = z
  .object({
    nodeId: z.string().trim().min(1).max(64),
    mark: z.enum(MARK_VALUES).nullable(),
  })
  .refine((input) => isMarkable(input.nodeId), { path: ["nodeId"], error: "Choose a career in the map." })
  .refine(
    (input) => input.mark !== "pursuing" || ["specialization", "occupation"].includes(levelOf(input.nodeId) ?? ""),
    { path: ["mark"], error: "Choose a specialization or an occupation as your direction." },
  );
export type MarkInput = z.infer<typeof MarkInput>;

const QUESTION_IDS = PREFERENCE_QUESTIONS.map((question) => question.id);

export const AnswerInput = z
  .object({
    questionId: z.string().trim().min(1).max(64),
    answer: z.enum(["a", "b", "both", "unsure"]).nullable(),
  })
  .refine((input) => QUESTION_IDS.includes(input.questionId), { path: ["questionId"], error: "Unknown question." });
export type AnswerInput = z.infer<typeof AnswerInput>;

/** Turn stored rows into state, dropping anything that no longer exists in the map. */
export function toState(
  marks: readonly { nodeId: string; mark: string }[],
  answers: readonly { questionId: string; answer: string }[],
): SavedAtlasState {
  const graph = atlasGraph();
  const state: SavedAtlasState = { available: true, interested: [], dismissed: [], pursuing: null, answers: {} };
  for (const row of marks) {
    if (!graph.nodes.has(row.nodeId as AtlasNodeId)) continue;
    const id = row.nodeId as AtlasNodeId;
    if (row.mark === "interested") state.interested.push(id);
    else if (row.mark === "dismissed") state.dismissed.push(id);
    else if (row.mark === "pursuing") {
      state.pursuing = id;
      state.interested.push(id);
    }
  }
  for (const row of answers) {
    if (QUESTION_IDS.includes(row.questionId) && ["a", "b", "both", "unsure"].includes(row.answer)) {
      state.answers[row.questionId] = row.answer as QuestionAnswer;
    }
  }
  state.interested.sort();
  state.dismissed.sort();
  return state;
}

export async function loadAtlasState(userId: string): Promise<SavedAtlasState> {
  if (!userId) return EMPTY;
  try {
    const [marks, answers] = await db.batch([
      db.select({ nodeId: careerAtlasMarks.nodeId, mark: careerAtlasMarks.mark }).from(careerAtlasMarks).where(eq(careerAtlasMarks.userId, userId)),
      db
        .select({ questionId: careerAtlasAnswers.questionId, answer: careerAtlasAnswers.answer })
        .from(careerAtlasAnswers)
        .where(eq(careerAtlasAnswers.userId, userId)),
    ]);
    return toState(marks, answers);
  } catch {
    // Most likely the migration hasn't been applied on this database yet. Atlas falls back to on-screen only.
    return EMPTY;
  }
}

export async function saveMark(userId: string, input: MarkInput): Promise<void> {
  if (!userId) throw new Error("missing_user_id");
  const now = new Date();
  if (input.mark === null) {
    await db.delete(careerAtlasMarks).where(and(eq(careerAtlasMarks.userId, userId), eq(careerAtlasMarks.nodeId, input.nodeId)));
    return;
  }
  const upsert = db
    .insert(careerAtlasMarks)
    .values({ userId, nodeId: input.nodeId, mark: input.mark, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: [careerAtlasMarks.userId, careerAtlasMarks.nodeId], set: { mark: input.mark, updatedAt: now } });
  if (input.mark === "pursuing") {
    // One direction at a time: the previous one stays as Interested.
    await db.batch([
      db
        .update(careerAtlasMarks)
        .set({ mark: "interested", updatedAt: now })
        .where(and(eq(careerAtlasMarks.userId, userId), eq(careerAtlasMarks.mark, "pursuing"), ne(careerAtlasMarks.nodeId, input.nodeId))),
      upsert,
    ]);
    return;
  }
  await upsert;
}

export async function saveAnswer(userId: string, input: AnswerInput): Promise<void> {
  if (!userId) throw new Error("missing_user_id");
  const now = new Date();
  if (input.answer === null) {
    await db
      .delete(careerAtlasAnswers)
      .where(and(eq(careerAtlasAnswers.userId, userId), eq(careerAtlasAnswers.questionId, input.questionId)));
    return;
  }
  await db
    .insert(careerAtlasAnswers)
    .values({ userId, questionId: input.questionId, answer: input.answer, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [careerAtlasAnswers.userId, careerAtlasAnswers.questionId],
      set: { answer: input.answer, updatedAt: now },
    });
}

export async function clearAnswers(userId: string): Promise<void> {
  if (!userId) throw new Error("missing_user_id");
  await db.delete(careerAtlasAnswers).where(eq(careerAtlasAnswers.userId, userId));
}
