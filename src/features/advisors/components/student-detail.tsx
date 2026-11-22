import { Card } from "@/components/ui";
import type { StudentDetail } from "@/features/advisors/access";

const WOULD_RETURN: Record<string, string> = { yes: "Yes", maybe: "Maybe", no: "No" };

export const LOGGED_NOTE = "This view was added to the student's log with your name and the date.";

/** What an advisor sees for a student who opted in: exactly the fields in ADVISOR_FIELDS. */
export function StudentDetailView({ detail }: { detail: StudentDetail }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-neutral-700">{LOGGED_NOTE}</p>
      <Card>
        <h2 className="text-lg font-semibold">Profile</h2>
        <dl className="mt-2 grid gap-1 text-neutral-800">
          <div><dt className="inline font-medium">Email: </dt><dd className="inline break-all">{detail.email}</dd></div>
          <div><dt className="inline font-medium">Major: </dt><dd className="inline">{detail.major ?? "Not set"}</dd></div>
          <div><dt className="inline font-medium">Year: </dt><dd className="inline">{detail.year ?? "Not set"}</dd></div>
          <div><dt className="inline font-medium">Goal: </dt><dd className="inline">{detail.goal ?? "Not set"}</dd></div>
          <div><dt className="inline font-medium">Chosen direction: </dt><dd className="inline">{detail.direction ?? "None chosen"}</dd></div>
        </dl>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Work-style card</h2>
        {detail.archetype ? (
          <>
            <p className="mt-1 font-serif text-2xl leading-tight text-ink">{detail.archetype.name}</p>
            <p className="mt-1 text-neutral-800">{detail.archetype.description}</p>
            <ul className="mt-2 list-disc pl-5 text-neutral-800">
              {detail.archetype.traits.map((trait) => (
                <li key={trait}>{trait}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-neutral-800">The student hasn&apos;t taken the quiz.</p>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Co-ops and reviews</h2>
        {detail.coops.length === 0 ? <p className="mt-1 text-neutral-800">No co-ops logged.</p> : null}
        <ul className="mt-2 grid gap-3">
          {detail.coops.map((coop) => (
            <li key={coop.rotationNumber} className="rounded-xl border border-neutral-200 p-3 text-neutral-800">
              <p className="font-medium text-ink break-words">
                {coop.rotationNumber}. {coop.employer}: {coop.roleTitle}
              </p>
              <p className="text-sm">{coop.roleType} · {coop.term} · Would go back: {WOULD_RETURN[coop.wouldReturn] ?? coop.wouldReturn}</p>
              {coop.ratings ? (
                <p className="text-sm">
                  Enjoyment {coop.ratings.enjoyment} · Learning {coop.ratings.learning} · Mentorship {coop.ratings.mentorship} · Clarity {coop.ratings.clarityGained} (out of 5)
                </p>
              ) : (
                <p className="text-sm">No review yet.</p>
              )}
              {coop.sharedNote ? <p className="mt-1 whitespace-pre-line break-words text-sm">&ldquo;{coop.sharedNote}&rdquo;</p> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
