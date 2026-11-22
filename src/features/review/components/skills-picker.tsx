"use client";

import { useEffect, useState } from "react";
import { Button, ErrorNote, Select, TextInput } from "@/components/ui";
import { SKILLS } from "@/content/skills";
import { readApiJson } from "@/features/review/components/api-client";
import { MAX_SKILLS } from "@/features/review/components/review-form-model";
import { splitSkillChoices } from "@/features/review/major-skills";
import type { SkillChoice } from "@/features/skills/rank";
import { ROUTES } from "@/lib/constants";

const STARTER_CHOICES: SkillChoice[] = SKILLS.map((name) => ({ name, kind: "technical", status: "approved" }));

const KIND_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "non_technical", label: "Non-technical" },
];

/** "Skills used": chips for the student's major first, the rest behind "Show all", and "Add a skill". */
export function SkillsPicker({
  employerId,
  selected,
  majorSkills,
  disabled,
  error,
  onToggle,
  onAdded,
}: {
  employerId: string;
  selected: readonly string[];
  majorSkills: readonly string[];
  disabled: boolean;
  error: string | undefined;
  onToggle: (skill: string) => void;
  /** Called with a skill the student just added, so the form can select it. */
  onAdded: (skill: string) => void;
}) {
  const [choices, setChoices] = useState<SkillChoice[]>(STARTER_CHOICES);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillKind, setNewSkillKind] = useState("technical");
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // The company's own skill list, once a company is picked.
  useEffect(() => {
    if (!employerId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`${ROUTES.skills}?employerId=${encodeURIComponent(employerId)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload: { ok?: boolean; data?: { skills?: SkillChoice[] } }) => {
          if (payload.ok && payload.data?.skills) setChoices(payload.data.skills);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [employerId]);

  async function addSkill() {
    const name = newSkill.trim();
    if (name.length < 2 || disabled) return;
    setMessage(null);
    try {
      const response = await fetch(ROUTES.skills, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, kind: newSkillKind }),
      });
      const result = await readApiJson<{ name: string; kind: "technical" | "non_technical"; status: "approved" | "pending" }>(response);
      if (!result.ok) {
        setMessage(result.error.fields?.name ?? result.error.message);
        return;
      }
      const added = result.data;
      setChoices((current) => (current.some((skill) => skill.name === added.name) ? current : [...current, added]));
      onAdded(added.name);
      setNewSkill("");
      setMessage(added.status === "pending" ? "Added for you. Other students see it after a founder approves it." : "Added.");
    } catch {
      setMessage("Could not add that skill.");
    }
  }

  const groups = splitSkillChoices(choices, majorSkills, [...selected]);
  const visible = showAll ? [...groups.primary, ...groups.rest] : groups.primary;

  return (
    <div
      id="skills-used"
      tabIndex={-1}
      aria-label="Skills used"
      className="flex flex-col gap-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <p className="text-sm font-medium text-neutral-900">Skills used</p>
      <p className="text-sm text-neutral-600">
        Pick up to 10.{majorSkills.length > 0 ? " Skills for your major come first." : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map((skill) => {
          const isSelected = selected.includes(skill.name);
          return (
            <button
              key={skill.name}
              type="button"
              disabled={disabled || (!isSelected && selected.length >= MAX_SKILLS)}
              aria-pressed={isSelected}
              className={`min-h-12 max-w-full rounded-full border px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-ink bg-ink text-white"
                  : "border-neutral-200 bg-white text-ink shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-neutral-50"
              }`}
              onClick={() => onToggle(skill.name)}
            >
              {skill.name}
              {skill.status === "pending" ? " (private until approved)" : ""}
            </button>
          );
        })}
      </div>
      {groups.rest.length > 0 ? (
        <button
          type="button"
          className="min-h-12 self-start rounded-xl px-1 text-base font-medium text-neutral-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-expanded={showAll}
          aria-controls="skills-used"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show fewer skills" : `Show all skills (${groups.rest.length} more)`}
        </button>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <TextInput
          id="newSkill"
          name="newSkill"
          value={newSkill}
          disabled={disabled}
          placeholder="Add a skill"
          maxLength={60}
          onChange={(event) => setNewSkill(event.target.value)}
        />
        <Select id="newSkillKind" value={newSkillKind} options={KIND_OPTIONS} onChange={setNewSkillKind} disabled={disabled} />
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={disabled || newSkill.trim().length < 2}
          onClick={() => void addSkill()}
        >
          Add skill
        </Button>
      </div>
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
