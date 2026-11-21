import { analyzeSkillTargets } from "@/features/action/gap-analysis";
import { templateTasks, TEMPLATE_VERSION } from "@/features/action/templates";
import type { ActionGoal, PlanDraft } from "@/features/action/types";
import type { AtlasGraph } from "@/features/atlas/graph";
import { atlasGraph } from "@/features/atlas/graph";

/**
 * Planning Service port. Phase 1 ships only a deterministic template adapter.
 * No AI SDK, no provider keys, no network. A future adapter can implement the
 * same interface without changing storage or UI contracts.
 */
export type PlanningContext = {
  /** Never leave the app process for a provider in Phase 1. */
  userId: string;
  goal: ActionGoal;
  profile: {
    major: string | null;
    majorSource: string | null;
    year: number | null;
    lifeGoal: "industry" | "grad_school" | "undecided" | null;
  };
};

export interface PlanningService {
  draftPlan(ctx: PlanningContext): Promise<PlanDraft>;
}

/** Deterministic MVP planner — works fully offline with no AI. */
export class TemplatePlanningService implements PlanningService {
  constructor(private readonly graph: AtlasGraph = atlasGraph()) {}

  async draftPlan(ctx: PlanningContext): Promise<PlanDraft> {
    void ctx.userId;
    void ctx.profile;
    void TEMPLATE_VERSION;
    return {
      source: "template_v1",
      goal: ctx.goal,
      skills: analyzeSkillTargets(ctx.goal, this.graph),
      tasks: templateTasks(ctx.goal),
    };
  }
}

/** Default app wiring until a real provider exists (it does not yet). */
export function defaultPlanningService(graph: AtlasGraph = atlasGraph()): PlanningService {
  return new TemplatePlanningService(graph);
}
