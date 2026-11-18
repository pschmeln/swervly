import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/constants";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function sourceFiles(dir: string): string[] {
  const absolute = path.join(root, dir);
  const found: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const relative = path.join(dir, entry);
    const full = path.join(root, relative);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(relative));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(relative.split(path.sep).join("/"));
    }
  }
  return found;
}

const srcFiles = sourceFiles("src");

function text(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

describe("community mock boundary", () => {
  it("keeps the prototype route off the production Direction page", () => {
    const direction = text("src/app/(app)/direction/page.tsx");
    expect(direction).not.toContain("community/mock");
    expect(direction).not.toContain("career-explore");
    expect(direction).not.toContain("direction/explore");
    expect(ROUTES.directionExplore).toBe("/direction/explore");
    expect(text("src/app/(app)/direction/explore/page.tsx")).toContain("prototypeModel");
    expect(text("src/app/(app)/direction/explore/page.tsx")).not.toContain("community/mock");
  });

  it("lets only the view-model import sample community data", () => {
    const importers = srcFiles.filter((file) => text(file).includes("features/community/mock"));
    expect(importers).toEqual(["src/features/explore/view-model.ts"]);
  });

  it("keeps the mock module free of app and database imports", () => {
    const mockFiles = srcFiles.filter((file) => file.includes("features/community/mock/"));
    expect(mockFiles.length).toBeGreaterThan(0);
    for (const file of mockFiles) {
      const source = text(file);
      expect(source).not.toMatch(/\bfrom\s+["']/);
      expect(source).not.toMatch(/\bimport\s*\(/);
      expect(source).not.toContain("@/db");
      expect(source).not.toContain("drizzle");
      expect(source).not.toContain("schema");
      expect(source).not.toMatch(/fetch\s*\(/);
    }
  });

  it("keeps client components and the catalog off the mock module", () => {
    for (const file of srcFiles) {
      const source = text(file);
      if (!source.includes('"use client"') && !source.includes("'use client'")) continue;
      expect(source).not.toContain("features/community/mock");
      expect(source).not.toContain("features/explore/view-model");
      expect(source).not.toContain("features/explore/companies");
    }
  });

  it("does not touch the database from the explore or community trees", () => {
    const trees = srcFiles.filter(
      (file) => file.includes("features/explore/") || file.includes("features/community/"),
    );
    expect(trees.length).toBeGreaterThan(0);
    for (const file of trees) {
      const source = text(file);
      expect(source).not.toContain("@/db");
      expect(source).not.toContain("drizzle");
      expect(source).not.toMatch(/fetch\s*\(/);
    }
  });
});
