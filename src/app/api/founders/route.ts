import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { MajorModerationInput, moderateMajor } from "@/features/majors/moderate";
import { moderate } from "@/features/moderation/server";
import { ModerationInput } from "@/features/review/schemas";
import { isFounderEmail } from "@/lib/founders";

const FounderPostInput = z.union([ModerationInput, MajorModerationInput]);

export const POST = handle(async (req) => {
  const user = await apiUser();
  if (!isFounderEmail(user.email)) {
    throw new ApiError(404, "not_found", "Not found.");
  }
  const input = await parseBody(req, FounderPostInput);
  if (input.kind === "major") {
    return ok(await moderateMajor(user.email, input));
  }
  return ok(await moderate(input));
});
