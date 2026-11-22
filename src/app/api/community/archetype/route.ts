import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { shareArchetype } from "@/features/community/archetype-share";
import { ArchetypeShareInput } from "@/features/community/rules";

/** Share the signed-in student's own work-style card to Community, with an optional line (item 19). */
export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const { text } = await parseBody(req, ArchetypeShareInput);
  return ok(await shareArchetype(user, text));
});
