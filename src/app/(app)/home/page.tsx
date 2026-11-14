import { count, eq } from "drizzle-orm";
import { Button, Card, PageShell } from "@/components/ui";
import { db } from "@/db";
import { rotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export default async function HomePage() {
  const user = await requireUser();
  const [row] = await db
    .select({ value: count() })
    .from(rotations)
    .where(eq(rotations.userId, user.id));
  const rotationCount = Number(row?.value ?? 0);
  const onboarded = user.onboardedAt != null;
  const countLabel = rotationCount === 1 ? "1 co-op logged." : `${rotationCount} co-ops logged.`;

  return (
    <PageShell title="Home">
      <div className="grid gap-4">
        <Card>
          <h2 className="text-lg font-semibold">1. Finish your profile</h2>
          <p className="mt-1 text-neutral-700">{onboarded ? "Done." : "Add your basics, goals, and interests."}</p>
          <div className="mt-4">
            <Button href={ROUTES.onboarding}>{onboarded ? "Review your profile" : "Finish your profile"}</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">2. Log your co-ops</h2>
          <p className="mt-1 text-neutral-700">{countLabel}</p>
          <div className="mt-4">
            {onboarded ? (
              <Button href={ROUTES.reviews}>Log your co-ops</Button>
            ) : (
              <Button disabled>Log your co-ops</Button>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
