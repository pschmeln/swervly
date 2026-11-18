import { Card, PageShell } from "@/components/ui";
import { requireOnboardedUser } from "@/lib/auth";
import { ReviewForm } from "@/features/review/components/review-form";
import { skillsForMajor } from "@/features/review/major-skills";
import { listRotations } from "@/features/review/server";

export default async function NewReviewPage() {
  const user = await requireOnboardedUser();
  const rotations = await listRotations(user.id);
  const usedRotationNumbers = rotations.map((item) => item.rotationNumber);

  return (
    <PageShell title="Log a co-op">
      <Card>
        <ReviewForm
          mode="create"
          usedRotationNumbers={usedRotationNumbers}
          shareFreeTextDefault={user.shareFreeTextDefault}
          majorSkills={skillsForMajor(user)}
        />
      </Card>
    </PageShell>
  );
}
