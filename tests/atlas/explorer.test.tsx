import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import { ATLAS_BANNER } from "@/features/atlas/view";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("AtlasExplorer", () => {
  it("renders the first screen for a major with the banner and credit line", () => {
    const entry = atlasEntry(graph, { major: "Nursing", majorSource: "catalog" });
    const html = renderToStaticMarkup(<AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={null} />);
    expect(html).toContain("Starting from Nursing");
    expect(html).toContain("Clinical Care");
    expect(html).toContain(ATLAS_BANNER);
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

  it("asks a question first and shows no picks until the student answers", () => {
    const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    const html = renderToStaticMarkup(<AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={null} />);
    expect(html).toContain("Which would you rather explore?");
    expect(html).toContain("They are not saved");
    expect(html).not.toContain("Start here");
  });

  it("shows Start here with plain-language reasons after an answer, and no numbers", () => {
    const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    const html = renderToStaticMarkup(
      <AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={null} initialAnswers={{ "build-vs-model": "b" }} />,
    );
    expect(html).toContain("Start here");
    expect(html).toContain("You said you&#x27;d rather explore: using math models");
    expect(html).not.toMatch(/\d+\s*%|fit score|points/i);
  });

  it("shows saved choices: the chosen direction and the saved-answers note", () => {
    const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    const html = renderToStaticMarkup(
      <AtlasExplorer
        entry={entry}
        dismissedRoles={[]}
        initialFocus={null}
        saved={{ available: true, interested: ["spec:cfd-simulation"], dismissed: [], pursuing: "spec:cfd-simulation", answers: {} }}
      />,
    );
    expect(html).toContain("Your direction");
    expect(html).toContain("CFD simulation");
    expect(html).toContain("saved to your account");
  });
});
