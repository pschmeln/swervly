import { toDashboard } from "@/features/action-ui/adapter";
import type { ActionPreview } from "@/features/action-ui/source";
import type {
  ActionPlanBundleJson,
  ActionTaskJson,
  DashboardLoad,
  DashboardView,
  GoalLevel,
  GoalSource,
  PursuingDisplay,
  TaskView,
} from "@/features/action-ui/types";
import { localWeekRange, studentTimeZone } from "@/features/action-ui/week";

export const MOCK_PURSUING: PursuingDisplay = {
  title: "Application development",
  level: "specialization",
};

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOW_ISO = "2026-11-01T15:00:00.000Z";

const PRACTICE_NOTE = "Adapted from an O*NET important task for Software Developers. Practice idea only — not a job duty.";
const SKILL_NOTE = "O*NET lists this among the standout skills for Software Developers.";

function task(partial: Omit<ActionTaskJson, "planId" | "userId" | "createdAt" | "updatedAt"> & { createdAt?: string }): ActionTaskJson {
  return {
    planId: PLAN_ID,
    userId: USER_ID,
    createdAt: partial.createdAt ?? NOW_ISO,
    updatedAt: NOW_ISO,
    ...partial,
  };
}

/**
 * Synthetic plan shaped like the API JSON. Practice titles and skill names are
 * the O*NET 31.0 strings already stored for Software Developers (15-1252.00).
 * completedAt values are placed relative to `now` so the week summary stays true.
 */
export function filledBundle(now: Date = new Date(), timeZone: string = studentTimeZone()): ActionPlanBundleJson {
  const { start } = localWeekRange(now, timeZone);
  const thisWeek = new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const older = new Date(start.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan: {
      id: PLAN_ID,
      userId: USER_ID,
      goalNodeId: "occ:onet:15-1252.00",
      goalLevel: "occupation",
      goalTitle: "Software Developers",
      goalSource: "manual",
      draftSource: "template_v1",
      status: "active",
      weeklyHours: 5,
      horizonWeeks: 8,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
    tasks: [
      task({
        id: "22222222-2222-4222-8222-222222222221",
        title: "Practice: Monitor functioning of equipment to ensure system operates in conformance with specifications.",
        description: "Monitor functioning of equipment to ensure system operates in conformance with specifications.",
        phase: "practice",
        status: "doing",
        sortOrder: 0,
        origin: "template",
        originKey: "onet-task:0",
        explanation: PRACTICE_NOTE,
        dueOn: null,
        completedAt: null,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222222",
        title: "Update your resume for this direction",
        description: null,
        phase: "prepare",
        status: "todo",
        sortOrder: 1,
        origin: "template",
        originKey: "editorial:resume",
        explanation: "Swervly suggestion: tailor one page so this career goal is obvious to a reader.",
        dueOn: "2026-12-04",
        completedAt: null,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222223",
        title: "After your next co-op, log what you actually did",
        description: null,
        phase: "reflect",
        status: "todo",
        sortOrder: 2,
        origin: "template",
        originKey: "editorial:review-loop",
        explanation: "Swervly suggestion: Reviews close the Self → Direction → Action → Review loop.",
        dueOn: null,
        completedAt: null,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222224",
        title: "Practice: Analyze user needs and software requirements to determine feasibility of design within time and cost constraints.",
        description: "Analyze user needs and software requirements to determine feasibility of design within time and cost constraints.",
        phase: "practice",
        status: "todo",
        sortOrder: 3,
        origin: "template",
        originKey: "onet-task:1",
        explanation: PRACTICE_NOTE,
        dueOn: null,
        completedAt: null,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222225",
        title: "Find two people who work in this area",
        description: null,
        phase: "explore",
        status: "done",
        sortOrder: 5,
        origin: "template",
        originKey: "editorial:people",
        explanation: "Swervly suggestion: alumni, classmates, or LinkedIn contacts — not a claim that anyone is hiring.",
        dueOn: null,
        completedAt: thisWeek,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222226",
        title: "Shortlist organizations linked to this area in the career map",
        description: null,
        phase: "explore",
        status: "done",
        sortOrder: 6,
        origin: "template",
        originKey: "editorial:orgs",
        explanation: "Swervly suggestion: use Atlas organization links as starting points, not open roles.",
        dueOn: null,
        completedAt: older,
      }),
      task({
        id: "22222222-2222-4222-8222-222222222227",
        title: "Shadow a developer for an hour",
        description: null,
        phase: null,
        status: "todo",
        sortOrder: 7,
        origin: "user",
        originKey: null,
        explanation: "Added by you.",
        dueOn: null,
        completedAt: null,
      }),
    ],
    skills: [
      {
        id: "33333333-3333-4333-8333-333333333331",
        planId: PLAN_ID,
        userId: USER_ID,
        skillName: "Programming",
        scope: "shared",
        evidence: "known",
        skillSource: "onet",
        progress: "comfortable",
        originKey: "onet-skill:programming",
        explanation: SKILL_NOTE,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      },
      {
        id: "33333333-3333-4333-8333-333333333332",
        planId: PLAN_ID,
        userId: USER_ID,
        skillName: "Technology Design",
        scope: "shared",
        evidence: "known",
        skillSource: "onet",
        progress: "learning",
        originKey: "onet-skill:technology design",
        explanation: SKILL_NOTE,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        planId: PLAN_ID,
        userId: USER_ID,
        skillName: "Systems Analysis",
        scope: "shared",
        evidence: "known",
        skillSource: "onet",
        progress: "unrated",
        originKey: "onet-skill:systems analysis",
        explanation: SKILL_NOTE,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      },
    ],
  };
}

export function gapBundle(now: Date = new Date(), timeZone: string = studentTimeZone()): ActionPlanBundleJson {
  const filled = filledBundle(now, timeZone);
  return {
    ...filled,
    skills: [
      {
        id: "33333333-3333-4333-8333-333333333339",
        planId: PLAN_ID,
        userId: USER_ID,
        skillName: "Skills not listed yet",
        scope: "optional_exploration",
        evidence: "unknown",
        skillSource: "editorial",
        progress: "unrated",
        originKey: "editorial:skills-unknown",
        explanation: "O*NET standout skills are not on file for this occupation in Swervly yet. That is missing data, not a claim that you lack skills.",
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      },
    ],
  };
}

export function filledDashboard(now: Date = new Date(), timeZone: string = studentTimeZone()): DashboardView {
  const view = toDashboard(filledBundle(now, timeZone));
  if (!view) throw new Error("mock bundle did not map");
  return view;
}

export function previewLoad(preview: ActionPreview, now: Date = new Date()): DashboardLoad {
  if (preview === "empty" || preview === "empty-pursuing") return { status: "empty" };
  if (preview === "unavailable") return { status: "unavailable" };
  if (preview === "error") return { status: "error", message: "Something went wrong." };
  if (preview === "gap") {
    const dashboard = toDashboard(gapBundle(now));
    if (!dashboard) return { status: "error", message: "Something went wrong." };
    return { status: "ready", dashboard };
  }
  return { status: "ready", dashboard: filledDashboard(now) };
}

export function previewPursuing(preview: ActionPreview): PursuingDisplay | null {
  return preview === "empty-pursuing" ? MOCK_PURSUING : null;
}

let mockSeq = 0;

function nextId(): string {
  mockSeq += 1;
  return `44444444-4444-4444-8444-${String(mockSeq).padStart(12, "0")}`;
}

/** Local stand-in for a newly seeded plan. Tasks start to-do; ratings start unrated. */
export function freshDashboard(goal: { title: string; level: GoalLevel; source: GoalSource; weeklyHours: number | null; horizonWeeks: number | null }, now: Date = new Date()): DashboardView {
  const base = filledDashboard(now);
  const editorial = base.tasks.filter((item) => item.origin === "template" && item.originKey?.startsWith("editorial:"));
  const tasks: TaskView[] = editorial.map((item, index) => ({
    ...item,
    id: nextId(),
    status: "todo",
    completedAt: null,
    sortOrder: index,
  }));
  return {
    planId: nextId(),
    goalTitle: goal.title,
    goalLevel: goal.level,
    goalSource: goal.source,
    weeklyHours: goal.weeklyHours,
    horizonWeeks: goal.horizonWeeks,
    tasks,
    skills: base.skills.map((skill) => ({ ...skill, id: nextId(), progress: "unrated" })),
  };
}
