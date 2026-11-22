import { z } from "zod";
import { ApiError } from "@/lib/api";

const Id = z.uuid();

/** The [id] segment of a Community route, validated as a uuid. */
export async function idFrom(ctx: { params: Promise<Record<string, string | string[]>> }): Promise<string> {
  const params = await ctx.params;
  const parsed = Id.safeParse(params.id);
  if (!parsed.success) throw new ApiError(404, "not_found", "Not found.");
  return parsed.data;
}
