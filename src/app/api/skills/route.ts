import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { publicAggregateMajor } from "@/features/majors/selection";
import { createSkill, listSkillChoices } from "@/features/skills/server";
import { SkillCreateInput } from "@/features/review/schemas";

export const GET = handle(async (req) => {
  const user = await apiOnboardedUser();
  const employerId = new URL(req.url).searchParams.get("employerId");
  const skills = await listSkillChoices(
    user.id,
    employerId,
    publicAggregateMajor({ major: user.major, majorSource: user.majorSource }),
  );
  return ok({ skills });
});

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, SkillCreateInput);
  return ok(await createSkill(user.id, input));
});
