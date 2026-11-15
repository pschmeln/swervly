import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { RotationInput } from "@/features/review/schemas";
import { createRotation, listRotations } from "@/features/review/server";

export const GET = handle(async () => {
  const user = await apiOnboardedUser();
  const data = await listRotations(user.id);
  return ok(data);
});

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const body = await parseBody(req, RotationInput);
  const data = await createRotation(user.id, body);
  return Response.json({ ok: true, data }, { status: 201 });
});
