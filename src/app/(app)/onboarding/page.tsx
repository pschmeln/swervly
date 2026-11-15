import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { OnboardingFlow } from "@/features/profile/components/onboarding-flow";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Onboarding" };

function isRetake(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.includes("1");
  return value === "1";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  if (user.onboardedAt && !isRetake(params.retake)) redirect(ROUTES.home);

  const [profile] = await db
    .select({
      goal: profiles.goal,
      goalNotes: profiles.goalNotes,
      locationConstraint: profiles.locationConstraint,
      constraintsNotes: profiles.constraintsNotes,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return (
    <PageShell title="Onboarding">
      <OnboardingFlow
        initialStep={profile ? 3 : 1}
        defaults={{
          consentPrivacy: user.consentPrivacyAt != null,
          consentDataUse: user.consentDataUseAt != null,
          major: user.major ?? "",
          year: user.year == null ? "" : String(user.year),
          coopTrack: user.coopTrack ?? "",
          goal: profile?.goal ?? "",
          goalNotes: profile?.goalNotes ?? "",
          locationConstraint: profile?.locationConstraint ?? "",
          constraintsNotes: profile?.constraintsNotes ?? "",
        }}
      />
    </PageShell>
  );
}
