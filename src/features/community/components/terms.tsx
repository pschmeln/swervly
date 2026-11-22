import { Checkbox } from "@/components/ui";
import { COMMUNITY_TERMS } from "@/features/community/rules";

/** The Community rules, shown once before a student's first post, answer or report. */
export function CommunityTerms({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
      <p className="text-sm font-semibold text-ink">Community rules</p>
      <ul className="grid list-disc gap-1 pl-5 text-sm text-neutral-700">
        {COMMUNITY_TERMS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="[&_label]:items-start [&_input]:mt-0.5">
        <Checkbox id="communityTerms" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} label="I agree to the Community rules" />
      </div>
    </div>
  );
}
