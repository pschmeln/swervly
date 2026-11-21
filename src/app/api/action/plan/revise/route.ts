import { reviseActivePlan } from "@/features/action/server";
import { handle, ok } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

/** Same-plan template refresh: append missing origin_keys; keep edits and progress. */
export const POST = handle(async () => {
  const user = await apiOnboardedUser();
  const bundle = await reviseActivePlan(user);
  return ok(bundle);
});
