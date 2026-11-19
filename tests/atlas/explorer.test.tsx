import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("AtlasExplorer", () => {
  it("renders the first screen for a major with the banner and credit line", () => {
    const entry = atlasEntry(graph, { major: "Nursing", majorSource: "catalog" });
    const html = renderToStaticMarkup(<AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={null} />);
    expect(html).toContain("Starting from Nursing");
    expect(html).toContain("Clinical Care");
    expect(html).toContain("not a prediction of fit");
    expect(html).toContain("Used under the CC BY 4.0 license");
  });

  it("opens straight onto a family when Direction links to one", () => {
    const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    const html = renderToStaticMarkup(
      <AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus="fam:simulation-validation" />,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("CFD simulation");
    expect(html).toContain("Why this is shown");
  });

  it("renders an occupation with an external O*NET OnLine link that opens safely", () => {
    const entry = atlasEntry(graph, { major: null, majorSource: "undecided" });
    const html = renderToStaticMarkup(<AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus="occ:onet:29-1141.00" />);
    expect(html).toContain("Registered Nurses");
    expect(html).toContain('href="https://www.onetonline.org/link/summary/29-1141.00"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Typical tasks");
    expect(html).toContain("doesn&#x27;t flag any software as in demand");
  });
});
