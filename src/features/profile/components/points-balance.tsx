import { Card } from "@/components/ui";
import { POINTS_COMING_SOON, pointsBalanceLabel } from "@/features/profile/referral-copy";

export function PointsBalance({ points }: { points: number }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Points</h2>
      <p className="mt-1 text-neutral-800">{pointsBalanceLabel(points)}</p>
      <p className="mt-1 text-neutral-700">{POINTS_COMING_SOON}</p>
    </Card>
  );
}
