import { describe, expect, it } from "vitest";
import { ActionAuthzError, allOwned, filterOwned, requireOwned } from "@/features/action/authz";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

describe("Action authz helpers", () => {
  const rows = [
    { id: "1", userId: A, title: "mine" },
    { id: "2", userId: B, title: "theirs" },
    { id: "3", userId: A, title: "also mine" },
  ];

  it("filters to the signed-in user only", () => {
    expect(filterOwned(rows, A).map((row) => row.id)).toEqual(["1", "3"]);
    expect(filterOwned(rows, B).map((row) => row.id)).toEqual(["2"]);
    expect(filterOwned(rows, "")).toEqual([]);
  });

  it("requireOwned refuses another user's row (cross-user)", () => {
    expect(requireOwned(rows[0], A).id).toBe("1");
    expect(() => requireOwned(rows[0], B)).toThrow(ActionAuthzError);
    expect(() => requireOwned(null, A)).toThrow(ActionAuthzError);
    expect(() => requireOwned(rows[1], A)).toThrow(ActionAuthzError);
  });

  it("allOwned is false when any foreign row sneaks in", () => {
    expect(allOwned(filterOwned(rows, A), A)).toBe(true);
    expect(allOwned(rows, A)).toBe(false);
    expect(allOwned([], A)).toBe(true);
  });
});
