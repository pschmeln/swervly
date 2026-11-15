import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { EmployerCreateInput } from "@/features/review/schemas";
import {
  createOrFindEmployer,
  searchEmployers,
} from "@/features/review/server";

export const GET = handle(async (req) => {
  const user = await apiOnboardedUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const data = await searchEmployers(user.id, q);
  return ok(data);
});

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const body = await parseBody(req, EmployerCreateInput);
  const { employer, created } = await createOrFindEmployer(user.id, body);

  return Response.json(
    { ok: true, data: employer },
    { status: created ? 201 : 200 },
  );
});
