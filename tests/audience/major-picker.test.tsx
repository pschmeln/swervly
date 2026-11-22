import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MajorPicker } from "@/features/majors/components/major-picker";

describe("major picker for engineering students", () => {
  it("does not offer Undecided", () => {
    const html = renderToStaticMarkup(
      <MajorPicker id="major" value={{ source: "catalog", name: "" }} context={{}} onChange={() => {}} />,
    );
    expect(html).toContain("Search the list, or enter a major that is missing.");
    expect(html).not.toContain("Undecided");
  });
});
