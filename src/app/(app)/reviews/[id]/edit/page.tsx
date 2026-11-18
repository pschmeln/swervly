import { notFound } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { requireOnboardedUser } from "@/lib/auth";
import { ReviewForm } from "@/features/review/components/review-form";
import { skillsForMajor } from "@/features/review/major-skills";
import { listRotations } from "@/features/review/server";

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const rotations = await listRotations(user.id);
  const rotation = rotations.find((item) => item.id === id);

  if (!rotation) {
    notFound();
  }

  const usedRotationNumbers = rotations
    .filter((item) => item.id !== rotation.id)
    .map((item) => item.rotationNumber);

  return (
    <PageShell title="Edit co-op">
      <Card>
        <ReviewForm
          mode="edit"
          rotation={rotation}
          usedRotationNumbers={usedRotationNumbers}
          shareFreeTextDefault={user.shareFreeTextDefault}
          majorSkills={skillsForMajor(user)}
        />
      </Card>
    </PageShell>
  );
}
