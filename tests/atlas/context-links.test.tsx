import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

import { FromStudentsCard } from "@/features/atlas/components/atlas-sections";
import {
  communityRoleHref,
  discussionLinksForNode,
  discussionLinksForRole,
  MAX_DISCUSSION_LINKS,
  REFLECT_LINE,
} from "@/features/atlas/context-links";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";
import { CareerSuggestions } from "@/features/direction/components/career-suggestions";
import { RULES_EVIDENCE_LABEL } from "@/features/direction/rules";
import { COMMUNITY_ROLE_IDS } from "@/features/community/rules";

const graph = atlasGraph();
const MECH: AtlasNodeId = "occ:onet:17-2141.00";

describe("career → Community and Reviews links", () => {
  it("opens Community posts for one role across every direction", () => {
    expect(communityRoleHref("software")).toBe("/community?role=software&all=1");
  });

  it("only links roles Community tags posts with and the current audience shows", () => {
    expect(discussionLinksForRole("software")).toEqual([{ role: "software", label: "Software", href: "/community?role=software&all=1" }]);
    expect(discussionLinksForRole("other")).toEqual([]);
    expect(discussionLinksForRole("insufficient")).toEqual([]);
    expect(discussionLinksForRole("marketing")).toEqual([]); // hidden for engineering students
  });

  it("gives a career map occupation a short list of its areas' discussion roles", () => {
    const links = discussionLinksForNode(graph, MECH);
    expect(links.length).toBeGreaterThan(0);
    expect(links.length).toBeLessThanOrEqual(MAX_DISCUSSION_LINKS);
    for (const link of links) expect(COMMUNITY_ROLE_IDS).toContain(link.role);
  });

  it("shows discussions and an optional reflection on a career page", () => {
    const html = renderToStaticMarkup(<FromStudentsCard discussions={discussionLinksForNode(graph, MECH)} />);
    expect(html).toContain("From students");
    expect(html).toContain("/community?role=");
    expect(html).toContain('href="/reviews/new"');
    expect(html.replace(/&#x27;/g, "'")).toContain(REFLECT_LINE);
  });

  it("puts an Ask students link on a Direction card, and no primary Community or Review button", () => {
    const html = renderToStaticMarkup(
      <CareerSuggestions
        initialLabel="Roles"
        initialSuggestions={[
          {
            roleType: "software",
            roleLabel: "Software",
            reason: "x",
            parts: [{ kind: "quiz", text: "x" }],
            source: "rules",
            evidenceLabel: RULES_EVIDENCE_LABEL,
          },
        ]}
        initialExhausted={false}
        interestedRoles={[]}
        hasPriorities
      />,
    );
    expect(html).toContain("Ask students about Software");
    expect(html).toContain('href="/community?role=software&amp;all=1"');
    expect(html).toContain('href="/community?tab=companies"');
    expect(html).not.toMatch(/<a[^>]*bg-ink text-white[^>]*href="\/(community|reviews)/);
    expect(html).not.toMatch(/<a[^>]*href="\/(community|reviews)[^"]*"[^>]*bg-ink text-white/);
  });
});
