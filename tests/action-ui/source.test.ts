import { describe, expect, it } from "vitest";
import { goalById, searchGoals } from "@/features/action-ui/catalog";
import { resolveActionSource, resolvePreview } from "@/features/action-ui/source";

describe("data source", () => {
  it("uses mock data only in development", () => {
    expect(resolveActionSource({ NODE_ENV: "development" })).toBe("mock");
    expect(resolveActionSource({ NODE_ENV: "development", ACTION_UI_SOURCE: "api" })).toBe("api");
    expect(resolveActionSource({ NODE_ENV: "production", ACTION_UI_SOURCE: "mock" })).toBe("api");
    expect(resolveActionSource({ NODE_ENV: "test" })).toBe("api");
  });

  it("ignores preview fixtures unless the source is mock", () => {
    expect(resolvePreview("mock", "empty")).toBe("empty");
    expect(resolvePreview("mock", ["unavailable"])).toBe("unavailable");
    expect(resolvePreview("api", "empty")).toBe("filled");
    expect(resolvePreview("mock", "nope")).toBe("filled");
  });
});

describe("career search", () => {
  it("matches titles alphabetically and does not invent ids", () => {
    const matches = searchGoals("software");
    expect(matches.map((item) => item.title)).toEqual([...matches].sort((a, b) => a.title.localeCompare(b.title)).map((item) => item.title));
    expect(matches.some((item) => item.nodeId === "occ:onet:15-1252.00" && item.title === "Software Developers")).toBe(true);
    expect(searchGoals("")).toEqual([]);
    expect(goalById("spec:application-development")?.title).toBe("Application development");
    expect(goalById("fam:software-engineering")).toBeNull();
  });
});
