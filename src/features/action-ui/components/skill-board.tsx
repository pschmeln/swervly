import { Card } from "@/components/ui";
import { ONET_CREDIT } from "@/content/atlas/occupations";
import type { SkillProgress, SkillView } from "@/features/action-ui/types";
import { PROGRESS_COPY, PROGRESS_HEADING, skillGroups } from "@/features/action-ui/view";

const OPTIONS: readonly { value: SkillProgress; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "learning", label: "Developing" },
  { value: "unrated", label: "Not yet assessed" },
];

export function SkillBoard({
  skills,
  pending,
  onRate,
}: {
  skills: readonly SkillView[];
  pending: boolean;
  onRate: (id: string, progress: SkillProgress) => void;
}) {
  const board = skillGroups(skills);
  const showOnet = skills.some((skill) => skill.skillSource === "onet");
  const unratedShown = board.groups.some((group) => group.progress === "unrated");

  return (
    <Card>
      <div id="skills">
        <h2 className="text-lg font-semibold text-ink">Skills</h2>
        <p className="mt-1 text-sm text-ink-2">
          Comfortable {board.counts.comfortable} · Developing {board.counts.learning} · Not yet assessed {board.counts.unrated}
        </p>
        {unratedShown ? null : <p className="mt-2 text-sm text-ink-2">{PROGRESS_COPY.unrated}</p>}
        {board.unknown.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {board.unknown.map((skill) => (
              <p key={skill.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-ink-2">
                {skill.explanation}
              </p>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4">
          {board.groups.map((group) => (
            <section key={group.progress}>
              <h3 className="font-semibold text-ink">{group.heading}</h3>
              <p className="mt-1 text-sm text-ink-2">{group.note}</p>
              <ul className="mt-2 grid gap-2">
                {group.skills.map((skill) => (
                  <li key={skill.id} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                    <p className="font-medium text-ink">{skill.name}</p>
                    <p className="mt-1 text-sm text-ink-3">{skill.explanation}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{PROGRESS_HEADING[skill.progress]}</p>
                    <fieldset className="mt-3" disabled={pending}>
                      <legend className="sr-only">Your rating for {skill.name}</legend>
                      <div className="grid gap-2">
                        {OPTIONS.map((option) => {
                          const inputId = `${skill.id}-${option.value}`;
                          return (
                            <label key={option.value} htmlFor={inputId} className="flex min-h-12 items-center gap-3 text-base text-ink">
                              <input
                                id={inputId}
                                type="radio"
                                name={`skill-${skill.id}`}
                                value={option.value}
                                checked={skill.progress === option.value}
                                onChange={() => onRate(skill.id, option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {showOnet ? <p className="mt-4 text-xs leading-relaxed text-ink-3">{ONET_CREDIT}</p> : null}
      </div>
    </Card>
  );
}
