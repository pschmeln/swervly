export const YEAR_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const;

export const GOAL_OPTIONS = [
  { value: "industry", label: "Industry" },
  { value: "grad_school", label: "Graduate school" },
  { value: "undecided", label: "Undecided" },
] as const;

export const LOCATION_OPTIONS = [
  { value: "cincinnati_only", label: "Cincinnati only" },
  { value: "within_drive", label: "Within a drive" },
  { value: "anywhere", label: "Anywhere" },
] as const;

export const RIASEC_SCORES = [
  { key: "R", label: "Realistic (R)" },
  { key: "I", label: "Investigative (I)" },
  { key: "A", label: "Artistic (A)" },
  { key: "S", label: "Social (S)" },
  { key: "E", label: "Enterprising (E)" },
  { key: "C", label: "Conventional (C)" },
] as const;

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

export function textOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}
