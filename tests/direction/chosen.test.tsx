import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

import { chosenDirectionView } from "@/features/direction/chosen";
import { ChosenDirectionCard, ChosenDirectionLine, NO_DIRECTION_LINE } from "@/features/direction/components/chosen-direction";
import { HomeHub, type HomeHubProps } from "@/features/home/hub";

const MECH = "occ:onet:17-2141.00";

const hub: HomeHubProps = {
  quizDone: true,
  canReview: true,
  rotationCount: 0,
  majorLine: "Mechanical Engineering · Year 2",
  traits: [],
  suggestions: [],
  interested: [],
};

describe("chosen direction", () => {
  it("turns a stored occupation or specialization into a title and a career map link", () => {
    const occupation = chosenDirectionView(MECH);
    expect(occupation).toMatchObject({ title: "Mechanical Engineers", level: "occupation" });
    expect(occupation?.href).toBe(`/direction/atlas?at=${encodeURIComponent(MECH)}`);
    expect(chosenDirectionView("spec:test-validation")?.level).toBe("specialization");
  });

  it("ignores anything that cannot be a direction or is no longer in the map", () => {
    expect(chosenDirectionView(null)).toBeNull();
    expect(chosenDirectionView("fam:finance")).toBeNull();
    expect(chosenDirectionView("dom:healthcare")).toBeNull();
    expect(chosenDirectionView("occ:onet:99-9999.99")).toBeNull();
  });

  it("shows the direction with a way to change it, or invites a choice", () => {
    const chosen = chosenDirectionView(MECH);
    const card = renderToStaticMarkup(<ChosenDirectionCard chosen={chosen} />);
    expect(card).toContain("Mechanical Engineers");
    expect(card).toContain("Change direction");
    expect(card).toContain(`href="/direction/atlas?at=${encodeURIComponent(MECH)}"`);
    const empty = renderToStaticMarkup(<ChosenDirectionCard chosen={null} />);
    expect(empty).toContain("Choose a direction");
    expect(NO_DIRECTION_LINE).toContain("chosen a direction yet");
    expect(empty).toContain("chosen a direction yet");
    expect(renderToStaticMarkup(<ChosenDirectionLine chosen={chosen} />)).toContain(">Change<");
  });

  it("appears on Home only when the career map is on", () => {
    const withDirection = renderToStaticMarkup(<HomeHub {...hub} chosen={chosenDirectionView(MECH)} />);
    expect(withDirection).toContain("Your chosen direction");
    expect(withDirection).toContain("Mechanical Engineers");
    expect(renderToStaticMarkup(<HomeHub {...hub} chosen={null} />)).toContain("Choose one in the career map");
    expect(renderToStaticMarkup(<HomeHub {...hub} />)).not.toContain("Your chosen direction");
  });
});
