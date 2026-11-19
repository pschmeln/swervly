import { AnswerInput, clearAnswers, saveAnswer } from "@/features/atlas/server";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

/** Set or clear one Career Atlas preference answer for the signed-in student. */
export const PUT = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, AnswerInput);
  await saveAnswer(user.id, input);
  return ok({ questionId: input.questionId, answer: input.answer });
});

/** Clear all of the signed-in student's Career Atlas answers. */
export const DELETE = handle(async () => {
  const user = await apiOnboardedUser();
  await clearAnswers(user.id);
  return ok({ cleared: true });
});
