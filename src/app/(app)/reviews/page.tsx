import { Button, PageShell } from "@/components/ui";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { RotationCard } from "@/features/review/components/rotation-card";
import { listRotations } from "@/features/review/server";

export default async function ReviewsPage() {
  const user = await requireOnboardedUser();
  const rotations = await listRotations(user.id);

  if (rotations.length === 0) {
    return (
      <PageShell title="Reviews">
        <div className="flex flex-col gap-4">
          <p className="text-neutral-700">
            Nothing here yet. Log a co-op or internship you have already done.
          </p>
          <Button href={ROUTES.reviewsNew} className="w-full sm:w-auto">
            Log a co-op or internship
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reviews">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-neutral-700">Your co-ops and internships.</p>
          <Button href={ROUTES.reviewsNew} className="w-full sm:w-auto">
            Log another
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {rotations.map((rotation) => (
            <RotationCard key={rotation.id} rotation={rotation} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
