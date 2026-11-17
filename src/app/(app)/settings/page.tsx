import { currentUser } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { PageShell } from "@/components/ui";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SettingsForm } from "@/features/profile/components/settings-form";
import { requireUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [clerk, headerList, countRows] = await Promise.all([
    currentUser(),
    headers(),
    db.select({ value: count() }).from(users).where(eq(users.invitedByUserId, user.id)),
  ]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "app.swervly.com";
  const proto = headerList.get("x-forwarded-proto") ?? "https";

  return (
    <PageShell title="Settings">
      <SettingsForm
        passwordAlreadySet={clerk?.passwordEnabled === true}
        shareFreeTextDefault={user.shareFreeTextDefault}
        inviteHref={`${proto}://${host}/invite/${user.id}`}
        inviteCount={Number(countRows[0]?.value ?? 0)}
        founder={isFounderEmail(user.email)}
      />
    </PageShell>
  );
}
