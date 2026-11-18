import { Card } from "@/components/ui";
import type { PublicMajorView } from "@/features/company/aggregate";

function money(value: number): string {
  return `$${value}`;
}

/** The public company section. The review preview renders this same component. */
export function PublicMajorSection({
  view,
  employerName,
}: {
  view: PublicMajorView;
  employerName?: string;
}) {
  if (!view.visible) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">What other students see</h2>
        {employerName ? <p className="mt-1 text-neutral-700">{employerName}</p> : null}
        <p className="mt-2 text-neutral-700">
          This stays hidden until at least 2 different students in your major review this company.
          Multiple reviews from one student do not unlock it. Nothing from a smaller group is shown.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold break-words">
        {employerName ? `${employerName} · ` : ""}
        {view.major}
      </h2>
      <p className="mt-2 text-base text-neutral-900">{view.headline}</p>
      <p className="text-neutral-700">{view.maybeLine}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {view.basisLine} No names.
      </p>
      {view.averages ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-neutral-600">Enjoyment</dt>
            <dd className="font-medium">{view.averages.enjoyment.toFixed(1)} / 5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Learning</dt>
            <dd className="font-medium">{view.averages.learning.toFixed(1)} / 5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Mentorship</dt>
            <dd className="font-medium">{view.averages.mentorship.toFixed(1)} / 5</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Clarity</dt>
            <dd className="font-medium">{view.averages.clarityGained.toFixed(1)} / 5</dd>
          </div>
        </dl>
      ) : null}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-neutral-900">Top skills</h3>
        {view.topSkills.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-2">
            {view.topSkills.map((skill) => (
              <li key={skill} className="rounded-full border border-neutral-300 px-3 py-1 text-sm">
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">No shared skills yet.</p>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-neutral-900">Pay</h3>
        {view.payRange ? (
          <p className="mt-1 text-neutral-800">
            {view.payRange.low === view.payRange.high
              ? `${money(view.payRange.low)}/hr`
              : `${money(view.payRange.low)}–${money(view.payRange.high)}/hr`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">
            Pay stays hidden until 2 different students in this group report it.
          </p>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-neutral-900">Anything a student should know</h3>
        {view.sharedNotes.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {view.sharedNotes.map((note, index) => (
              <li key={`${index}-${note.slice(0, 24)}`} className="break-words text-neutral-800">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">No shared notes.</p>
        )}
      </div>
    </Card>
  );
}
