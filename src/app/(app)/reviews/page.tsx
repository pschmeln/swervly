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
            Nothing to review yet. Come back after your first rotation.
          </p>
          <Button href={ROUTES.reviewsNew} className="w-full sm:w-auto">
            Log your first co-op
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reviews">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-neutral-700">Your logged co-ops.</p>
          <Button href={ROUTES.reviewsNew} className="w-full sm:w-auto">
            Log another co-op
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
