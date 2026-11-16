import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewForm } from "@/features/review/components/review-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

describe("co-op or internship number", () => {
  it("explains the 1-5 field for summer internships", () => {
    const html = renderToStaticMarkup(<ReviewForm mode="create" />);
    expect(html).toContain("Co-op or internship number");
    expect(html).toContain("For summer internships, number them in the order you did them.");
    expect(html).toContain("other students without my name");
    expect(html).not.toContain("Rotation number");
    expect(html).not.toContain("other UC students");
  });
});
