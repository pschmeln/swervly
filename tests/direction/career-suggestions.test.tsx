import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

import {
  afterDismiss,
  CareerSuggestions,
  type CareerSuggestionView,
} from "@/features/direction/components/career-suggestions";
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

function text(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
}

describe("afterDismiss (immediate exhausted sync)", () => {
  it("clears the last suggestion and surfaces the exhausted heading immediately", () => {
    const next = afterDismiss([software], "software");
    expect(next.suggestions).toEqual([]);
    expect(next.exhausted).toBe(true);
    expect(next.label).toBe(DIRECTION_EXHAUSTED_LABEL);
  });

  it("only removes the dismissed role when others remain (replacements come from refresh)", () => {
    const next = afterDismiss([software, processFill], "software");
    expect(next.suggestions.map((item) => item.roleType)).toEqual(["manufacturing_process"]);
    expect(next.exhausted).toBe(false);
    expect(next.label).toBeNull();
  });
});

describe("CareerSuggestions exhausted and fallback copy", () => {
  it("renders exhausted label and action once, with no suggestion cards", () => {
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
});
