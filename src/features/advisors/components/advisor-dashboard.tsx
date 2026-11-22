import { Card } from "@/components/ui";
import type { AdvisorDashboard, GroupStats, SafeCount } from "@/features/advisors/roster";
import { RosterManager } from "./roster-manager";

export const FEWER_THAN_TWO = "Fewer than 2";
export const ROSTER_STATS_NOTE =
  "Counts only students on your roster who chose to share their details with your school's advisors. Anything from fewer than 2 students is hidden.";
export const SCHOOL_STATS_NOTE =
  "Every student who signed up with your school's email domains, whether or not they're on your roster. Anything from fewer than 2 students is hidden.";
export const ROSTER_OFF = "Roster upload isn't turned on yet. The founders need to finish setting it up.";

function show(value: SafeCount): string {
  return value === null ? FEWER_THAN_TWO : String(value);
}

function StatsBlock({ title, note, stats, studentsLabel }: { title: string; note: string; stats: GroupStats; studentsLabel: string }) {
  const rows: [string, SafeCount][] = [
    [studentsLabel, stats.students],
    ["Finished onboarding", stats.onboarded],
    ["Took the work-style quiz", stats.quizDone],
    ["Logged a co-op review", stats.reviewed],
  ];
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-700">{note}</p>
      <dl className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-t border-neutral-200 pt-2">
            <dt className="text-neutral-800">{label}</dt>
            <dd className="font-semibold text-ink">{show(value)}</dd>
          </div>
        ))}
      </dl>
      <RankedList title="Top chosen directions" items={stats.topDirections} />
      <RankedList title="Top companies reviewed" items={stats.topCompanies} />
    </Card>
  );
}

function RankedList({ title, items }: { title: string; items: GroupStats["topDirections"] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-600">None shared by 2 or more students yet.</p>
      ) : (
        <ol className="mt-2 grid gap-1">
          {items.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-3 text-neutral-800">
              <span className="break-words">{item.label}</span>
              <span className="shrink-0 text-sm text-neutral-600">{item.students} students</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** An approved advisor's page (item 15, PR 6.2): their roster, roster stats, and school-wide totals. */
export function AdvisorDashboardView({ dashboard }: { dashboard: AdvisorDashboard }) {
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Your roster</h2>
        {dashboard.rosterEnabled ? <RosterManager rosterSize={dashboard.rosterSize} /> : <p className="mt-2 text-neutral-800">{ROSTER_OFF}</p>}
      </Card>
      <StatsBlock title="Your roster" note={ROSTER_STATS_NOTE} stats={dashboard.roster} studentsLabel="Sharing with your school's advisors" />
      <StatsBlock title="Your whole school" note={SCHOOL_STATS_NOTE} stats={dashboard.school} studentsLabel="Signed up" />
    </div>
  );
}
