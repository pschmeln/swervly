import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { deleteAccount } from "@/features/profile/server";

const DeleteAccountInput = z.object({
  confirm: z.literal("DELETE"),
});

export const DELETE = handle(async (req) => {
  const user = await apiUser();
  await parseBody(req, DeleteAccountInput);
  await deleteAccount(user);
  return ok({ deleted: true });
});
