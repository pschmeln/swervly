import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

import { CareerSuggestions, type CareerSuggestionView } from "@/features/direction/components/career-suggestions";
import {
  beginDismiss,
  DISMISS_FAILED_MESSAGE,
  DISMISS_GATE_IDLE,
  DISMISS_UNKNOWN_MESSAGE,
  failDismiss,
  outcomeAfterPost,
  succeedDismissAwaitingRefresh,
} from "@/features/direction/components/dismiss-gate";
import {
  DIRECTION_EXHAUSTED_ACTION,
  DIRECTION_EXHAUSTED_LABEL,
  FALLBACK_EVIDENCE_LABEL,
  RULES_EVIDENCE_LABEL,
} from "@/features/direction/rules";

const software: CareerSuggestionView = {
  roleType: "software",
  roleLabel: "Software",
  reason: "Your major lines up directly with software work.",
  source: "rules",
  evidenceLabel: RULES_EVIDENCE_LABEL,
  reasons: ["Your major lines up directly with software work."],
};

const processFill: CareerSuggestionView = {
  roleType: "manufacturing_process",
  roleLabel: "Manufacturing/Process",
  reason: "Manufacturing and process work is a common engineering co-op path and a solid place to start.",
  source: "rules",
  evidenceLabel: FALLBACK_EVIDENCE_LABEL,
};

const fieldFill: CareerSuggestionView = {
  roleType: "field_site",
  roleLabel: "Field/Site",
  reason: "Field and site work is a common engineering co-op path and a solid place to start.",
  source: "rules",
  evidenceLabel: FALLBACK_EVIDENCE_LABEL,
};

function text(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
}

describe("CareerSuggestions exhausted and fallback copy", () => {
  it("renders exhausted label and action once from server props", () => {
    const html = renderToStaticMarkup(
      <CareerSuggestions
        initialLabel={DIRECTION_EXHAUSTED_LABEL}
        initialSuggestions={[]}
        initialExhausted
        interestedRoles={[]}
        hasPriorities={false}
        atlasOn
      />,
    );
    const t = text(html);
    expect(t).toContain(DIRECTION_EXHAUSTED_LABEL);
    expect(t).toContain(DIRECTION_EXHAUSTED_ACTION);
    expect(t.split(DIRECTION_EXHAUSTED_LABEL).length - 1).toBe(1);
    expect(t.split(DIRECTION_EXHAUSTED_ACTION).length - 1).toBe(1);
    expect(html).toContain("Retake the quiz");
    expect(html).toContain("Browse the career map");
  });

  it("does not show Why this matched on a fallback fill suggestion", () => {
    const html = renderToStaticMarkup(
      <CareerSuggestions
        initialLabel="Roles that fit how you work, based on your quiz and your major."
        initialSuggestions={[processFill]}
        initialExhausted={false}
        interestedRoles={[]}
        hasPriorities={false}
        atlasOn={false}
      />,
    );
    expect(html).not.toContain("Why this matched");
    expect(text(html)).toContain(FALLBACK_EVIDENCE_LABEL);
    expect(text(html)).toContain(processFill.reason);
  });

  it("keeps undismissed replacements visible when server still has them (no early exhausted)", () => {
    const html = renderToStaticMarkup(
      <CareerSuggestions
        initialLabel="Roles that fit how you work, based on your quiz and your major."
        initialSuggestions={[processFill, fieldFill]}
        initialExhausted={false}
        interestedRoles={[]}
        hasPriorities={false}
        atlasOn={false}
      />,
    );
    const t = text(html);
    expect(t).toContain("Field/Site");
    expect(t).toContain("Manufacturing/Process");
    expect(t).not.toContain(DIRECTION_EXHAUSTED_LABEL);
    expect(html).toContain("Not for me");
  });
});

describe("dismiss lifecycle (delayed / failed / serialized)", () => {
  it("rejects a second dismiss while the first is still awaiting refresh", () => {
    let gate = beginDismiss(DISMISS_GATE_IDLE, software.roleType)!;
    gate = succeedDismissAwaitingRefresh(gate);
    expect(beginDismiss(gate, fieldFill.roleType)).toBeNull();
  });

  it("after a failed request, the list stays put and a new dismiss can start", () => {
    const started = beginDismiss(DISMISS_GATE_IDLE, software.roleType)!;
    const idle = failDismiss(started);
    expect(idle).toEqual(DISMISS_GATE_IDLE);
    // Server list unchanged — Field/Site would still be there after reload.
    expect(beginDismiss(idle, fieldFill.roleType)).toEqual({ activeRole: fieldFill.roleType });
  });

  it("models a delayed response: no other role starts until unlock", () => {
    const started = beginDismiss(DISMISS_GATE_IDLE, processFill.roleType)!;
    expect(beginDismiss(started, fieldFill.roleType)).toBeNull();
    expect(beginDismiss(started, software.roleType)).toBeNull();
    expect(failDismiss(started).activeRole).toBeNull();
  });

  it("clears stale error semantics: failure unlocks; next claim starts clean", () => {
    // After failDismiss the gate is idle — a new attempt can claim and clear the prior error in UI.
    const afterFail = failDismiss(beginDismiss(DISMISS_GATE_IDLE, software.roleType)!);
    expect(afterFail).toEqual(DISMISS_GATE_IDLE);
    expect(beginDismiss(afterFail, software.roleType)?.activeRole).toBe(software.roleType);
  });

  it("confirmed fail and unknown never request a page refresh", () => {
    expect(outcomeAfterPost("failed", null).refresh).toBe(false);
    expect(outcomeAfterPost("timeout", "unknown").refresh).toBe(false);
    expect(outcomeAfterPost("timeout", "not_dismissed").refresh).toBe(false);
  });

  it("exposes card-adjacent copy for fail vs unknown", () => {
    expect(DISMISS_FAILED_MESSAGE).toContain("Couldn't save");
    expect(DISMISS_UNKNOWN_MESSAGE).toContain("Couldn't confirm whether that saved");
  });
});
