import { PageShell } from "@/components/ui";
import { SettingsForm } from "@/features/profile/components/settings-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();

  return (
    <PageShell title="Settings">
      <SettingsForm />
    </PageShell>
  );
}
