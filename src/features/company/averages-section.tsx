import Link from "next/link";
import { Card } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { ALL_MAJORS, type CompanyAverages, type PublicMajorView } from "@/features/company/aggregate";
import { PublicMajorSection } from "@/features/company/public-section";
import type { CommentView } from "@/features/community/server";

export const NOT_ENOUGH_MAJOR = "Not enough reviews from your major yet.";
export const NO_MAJOR_LINE = "Reviews are grouped by major. Add your major on your Profile to see your major's view.";
export const ALL_MAJORS_NOTE = "Pay and written notes appear only within a student's own major.";
export const NOTHING_YET = "No company page yet: at least 2 different students need to share reviews of it.";

/** Company page (item 4): the viewer's major, or the all-majors fallback when that is hidden. */
export function CompanyAveragesSection({
  employerName,
  viewerMajor,
  averages,
  threads,
}: {
  employerName: string;
  viewerMajor: string | null;
  averages: CompanyAverages;
  /** Comments on the viewer's major's shared notes (item 16). Notes never appear in the all-majors view. */
  threads?: { comments: Record<string, CommentView[]>; agreed: boolean };
}) {
  if (averages.mine.visible) return <PublicMajorSection employerName={employerName} view={averages.mine} threads={threads} />;
  return (
    <>
      <Card>
        <h2 className="text-lg font-semibold break-words">{employerName}</h2>
        <p className="mt-2 text-neutral-800">{viewerMajor ? NOT_ENOUGH_MAJOR : NO_MAJOR_LINE}</p>
        {averages.allMajors ? null : <p className="mt-1 text-sm text-neutral-600">{NOTHING_YET}</p>}
      </Card>
      {averages.allMajors ? <PublicMajorSection employerName={employerName} view={averages.allMajors} /> : null}
    </>
  );
}

function ratingsLine(view: PublicMajorView): string {
  const a = view.averages!;
  const parts = [
    `Enjoyment ${a.enjoyment.toFixed(1)}`,
    `Learning ${a.learning.toFixed(1)}`,
    `Mentorship ${a.mentorship.toFixed(1)}`,
    `Clarity ${a.clarityGained.toFixed(1)}`,
  ];
  return `${parts.join(" · ")} (out of 5) · ${view.wouldGoBackPercent}% would go back`;
}

/** Compact version for directory cards. Renders nothing for a company with no employer record. */
export function CompanyAveragesSummary({
  averages,
  href,
  hasMajor,
}: {
  averages: CompanyAverages;
  href: string;
  hasMajor: boolean;
}) {
  const shown = averages.mine.visible ? averages.mine : averages.allMajors;
  return (
    <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
      {averages.mine.visible ? null : <p className="text-neutral-700">{hasMajor ? NOT_ENOUGH_MAJOR : NO_MAJOR_LINE}</p>}
      {shown ? (
        <>
          <p className="font-medium text-neutral-900">{shown.major === ALL_MAJORS ? "All majors" : `Your major: ${shown.major}`}</p>
          <p className="text-neutral-800">{ratingsLine(shown)}</p>
          <p className="text-neutral-600">{shown.basisLine}</p>
          <Link href={href} className={`inline-flex min-h-12 items-center font-medium text-[#1d4ed8] underline ${focusRing}`}>
            See student reviews
          </Link>
        </>
      ) : null}
    </div>
  );
}
