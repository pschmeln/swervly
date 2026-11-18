import { cleanMajorName, matchCatalog, normalizeMajorName, type MajorSearchContext } from "./catalog";

export type MajorModerationAction = "approve" | "reject" | "merge";

export type PendingMajorSubmission = {
  status: string;
  rawName: string;
  normalizedName: string;
};

export type MajorPlan =
  | { type: "approve_new"; name: string; normalizedName: string }
  | { type: "merge"; canonicalName: string; normalizedAlias: string; addAlias: boolean }
  | { type: "reject" };

export type MajorPlanResult = { ok: true; plan: MajorPlan } | { ok: false; message: string };

function mergePlan(canonicalName: string, normalizedAlias: string): MajorPlan {
  return {
    type: "merge",
    canonicalName,
    normalizedAlias,
    addAlias: normalizeMajorName(canonicalName) !== normalizedAlias,
  };
}

export function planMajorModeration(
  input: {
    action: MajorModerationAction;
    submission: PendingMajorSubmission;
    intoName?: string;
  },
  context: MajorSearchContext = {},
): MajorPlanResult {
  if (input.submission.status !== "pending") {
    return { ok: false, message: "That item is no longer waiting." };
  }

  if (input.action === "reject") {
    return { ok: true, plan: { type: "reject" } };
  }

  if (input.action === "merge") {
    const intoName = input.intoName ? cleanMajorName(input.intoName) : "";
    if (!intoName) return { ok: false, message: "Choose a major to merge into." };
    const target = matchCatalog(intoName, context);
    if (!target || target.legacy) return { ok: false, message: "Choose a listed major to merge into." };
    return { ok: true, plan: mergePlan(target.name, input.submission.normalizedName) };
  }

  const match = matchCatalog(input.submission.rawName, context);
  if (match && !match.legacy) {
    return { ok: true, plan: mergePlan(match.name, input.submission.normalizedName) };
  }
  if (match?.legacy) {
    return { ok: false, message: "Choose a listed major to merge into." };
  }

  const name = cleanMajorName(input.submission.rawName);
  if (name.length < 2 || name.length > 120) {
    return { ok: false, message: "That major name can't be approved." };
  }
  return {
    ok: true,
    plan: { type: "approve_new", name, normalizedName: normalizeMajorName(name) },
  };
}

/** Public names after a decision. Reject and merge do not add the raw custom text. */
export function publicNamesAfterPlan(existing: readonly string[], plan: MajorPlan): string[] {
  if (plan.type === "approve_new" && !existing.includes(plan.name)) return [...existing, plan.name];
  return [...existing];
}
