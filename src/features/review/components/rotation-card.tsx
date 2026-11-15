"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiJson } from "@/features/review/components/api-client";
import type { RotationListItem } from "@/features/review/components/types";

const SEASON_LABELS: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

function termLabel(season: string, year: number): string {
  return `${SEASON_LABELS[season] ?? season} ${year}`;
}

export function RotationCard({ rotation }: { rotation: RotationListItem }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onDelete() {
    if (deleting) return;
    const confirmed = window.confirm(
      "Delete this co-op and its review? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(undefined);
    try {
      const response = await fetch(
        ROUTES.rotation.replace("[id]", rotation.id),
        { method: "DELETE" },
      );
      const result = await readApiJson<{ id: string }>(response);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete this co-op.");
    } finally {
      setDeleting(false);
    }
  }

  const { review } = rotation;

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {rotation.employer.name}
          </h2>
          <p className="mt-1 text-neutral-700">{rotation.roleTitle}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {termLabel(rotation.termSeason, rotation.termYear)} · Rotation{" "}
            {rotation.rotationNumber}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-600">Enjoyment</dt>
            <dd className="font-medium text-neutral-900">{review.enjoyment}/5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Learning</dt>
            <dd className="font-medium text-neutral-900">{review.learning}/5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Mentorship</dt>
            <dd className="font-medium text-neutral-900">{review.mentorship}/5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Clarity</dt>
            <dd className="font-medium text-neutral-900">
              {review.clarityGained}/5
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button
            href={ROUTES.reviewEdit.replace("[id]", rotation.id)}
            variant="secondary"
            disabled={deleting}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            disabled={deleting}
            onClick={() => void onDelete()}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </div>
    </Card>
  );
}
