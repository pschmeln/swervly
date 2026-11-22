import Link from "next/link";
import { Button, Field, Select } from "@/components/ui";
import { focusRing } from "@/components/ui/controls";
import { COMMUNITY_ROLE_OPTIONS } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";

export type PostFilterState = { company: string; role: string; all: boolean };

export function filterHref(state: PostFilterState): string {
  const params = new URLSearchParams();
  if (state.company) params.set("company", state.company);
  if (state.role) params.set("role", state.role);
  if (state.all) params.set("all", "1");
  const query = params.toString();
  return query ? `${ROUTES.community}?${query}` : ROUTES.community;
}

/** Filter posts by company and role (a plain GET form), and by the chosen direction with Show all one tap away. */
export function PostFilters({
  state,
  employers,
  directionTitle,
}: {
  state: PostFilterState;
  employers: readonly { id: string; name: string }[];
  directionTitle: string | null;
}) {
  return (
    <div className="grid gap-3">
      {directionTitle ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-neutral-800">{state.all ? "Showing posts about everything." : `Showing posts for your direction: ${directionTitle}.`}</p>
          <Link href={filterHref({ ...state, all: !state.all })} className={`inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-200 bg-white px-5 font-semibold ${focusRing}`}>
            {state.all ? `Only ${directionTitle}` : "Show all posts"}
          </Link>
        </div>
      ) : null}
      <form method="get" action={ROUTES.community} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {state.all ? <input type="hidden" name="all" value="1" /> : null}
        <Field label="Company" htmlFor="filter-company">
          <Select id="filter-company" name="company" defaultValue={state.company}
            options={[{ value: "", label: "All companies" }, ...employers.map((employer) => ({ value: employer.id, label: employer.name }))]} />
        </Field>
        <Field label="Role" htmlFor="filter-role">
          <Select id="filter-role" name="role" defaultValue={state.role} options={[{ value: "", label: "All roles" }, ...COMMUNITY_ROLE_OPTIONS]} />
        </Field>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">Filter</Button>
      </form>
    </div>
  );
}
