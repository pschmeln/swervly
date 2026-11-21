import { describe, expect, it } from "vitest";
import type { ActionPlan, ActionSkillProgress, ActionTask } from "@/db/schema";
import {
  toActionPlanBundleDto,
  toActionPlanDto,
  toActionSkillDto,
  toActionTaskDto,
} from "@/features/action/dto";

const now = new Date("2026-11-21T12:00:00.000Z");

const planRow = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  goalNodeId: "occ:onet:15-1252.00",
  goalLevel: "occupation",
  goalTitle: "Software Developers",
  goalSource: "manual",
  draftSource: "template_v1",
  status: "active",
  weeklyHours: 10,
  horizonWeeks: 12,
  createdAt: now,
  updatedAt: now,
} as ActionPlan;

const taskRow = {
  id: "33333333-3333-4333-8333-333333333333",
  planId: planRow.id,
  userId: planRow.userId,
  title: "Practice a small project",
  description: null,
  phase: "practice",
  status: "todo",
  sortOrder: 0,
  origin: "template",
  originKey: "template:practice:1",
  explanation: "Build something small.",
  dueOn: "2026-12-01",
  completedAt: null,
  createdAt: now,
  updatedAt: now,
} as ActionTask;

const skillRow = {
  id: "44444444-4444-4444-8444-444444444444",
  planId: planRow.id,
  userId: planRow.userId,
  skillName: "JavaScript",
  scope: "occupation_specific",
  evidence: "known",
  skillSource: "onet",
  progress: "learning",
  originKey: "skill:javascript",
  explanation: "Core language for this role.",
  createdAt: now,
  updatedAt: now,
} as ActionSkillProgress;

describe("Action client DTO contract", () => {
  it("nests goal and uses ISO timestamps on plans", () => {
    const dto = toActionPlanDto(planRow);
    expect(dto.goal).toEqual({
      nodeId: "occ:onet:15-1252.00",
      level: "occupation",
      title: "Software Developers",
      onetCode: "15-1252.00",
      source: "manual",
    });
    expect(dto).not.toHaveProperty("goalNodeId");
    expect(dto.createdAt).toBe("2026-11-21T12:00:00.000Z");
    expect(dto.weeklyHours).toBe(10);
  });

  it("maps tasks with dueOn as YYYY-MM-DD", () => {
    const dto = toActionTaskDto(taskRow);
    expect(dto.dueOn).toBe("2026-12-01");
    expect(dto.completedAt).toBeNull();
    expect(dto.originKey).toBe("template:practice:1");
  });

  it("maps skill_name to name for the client", () => {
    const dto = toActionSkillDto(skillRow);
    expect(dto.name).toBe("JavaScript");
    expect(dto).not.toHaveProperty("skillName");
    expect(dto.progress).toBe("learning");
  });

  it("bundles plan, tasks, and skills for API responses", () => {
    const bundle = toActionPlanBundleDto({
      plan: planRow,
      tasks: [taskRow],
      skills: [skillRow],
    });
    expect(bundle.plan.id).toBe(planRow.id);
    expect(bundle.tasks).toHaveLength(1);
    expect(bundle.skills[0]?.name).toBe("JavaScript");
  });
});
