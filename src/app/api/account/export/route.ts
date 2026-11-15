import { handle } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { exportAccount, type AccountExport } from "@/features/profile/server";

function accountFile(data: AccountExport): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="swervly-my-data.json"',
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = handle(async () => {
  const user = await apiUser();
  return accountFile(await exportAccount(user.id));
});
