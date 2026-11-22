import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A file without "use client" runs on the server. When it imports from a
 * "use client" module, Next.js hands it a client reference instead of the real
 * export: rendering a component that way is fine, but calling a function or
 * reading a constant throws or misbehaves at runtime ("Attempted to call X()
 * from the server but X is on the client"). Unit tests that import modules
 * directly never see this, so this test checks the imports themselves.
 *
 * Rule: from a "use client" module, a non-client file may import only
 * components (PascalCase names such as LocationFields) and types.
 */

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const EXTENSIONS = [".ts", ".tsx"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return EXTENSIONS.includes(path.extname(full)) ? [full] : [];
  });
}

/** True when the first statement is the "use client" directive. */
export function isClientSource(source: string): boolean {
  const withoutComments = source.replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*/, "");
  return /^\s*["']use client["']/.test(withoutComments);
}

/** Component names look like PascalCase words: LocationFields, Card. Not EMPTY_LOCATION, not locationValueFrom. */
export function isComponentName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);
}

type ImportedName = { name: string; specifier: string };

/** Value names (types skipped) imported or re-exported from each module specifier. */
export function valueImports(source: string): ImportedName[] {
  const found: ImportedName[] = [];
  const pattern = /(?:^|\n)\s*(import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const [, keyword, typeOnly, clause, specifier] = match;
    if (typeOnly) continue;
    const trimmed = clause.trim();
    if (keyword === "export" && !trimmed.startsWith("{") && !trimmed.startsWith("*")) continue;
    const namespace = trimmed.match(/\*\s+as\s+(\w+)/);
    if (namespace || trimmed === "*") {
      found.push({ name: "*", specifier });
      continue;
    }
    const defaultName = trimmed.match(/^(\w+)\s*(,|$)/);
    if (keyword === "import" && defaultName) found.push({ name: defaultName[1], specifier });
    const braces = trimmed.match(/\{([\s\S]*)\}/);
    if (!braces) continue;
    for (const raw of braces[1].split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      // The client module's export name is what matters, not a local alias.
      found.push({ name: item.split(/\s+as\s+/)[0].trim(), specifier });
    }
  }
  return found;
}

function resolveModule(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  const candidates = [base, ...EXTENSIONS.map((ext) => base + ext), ...EXTENSIONS.map((ext) => path.join(base, "index" + ext))];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

describe("server files never use non-component exports from client modules", () => {
  it("finds the rule's cases correctly", () => {
    expect(isClientSource('"use client";\nexport function A() {}')).toBe(true);
    expect(isClientSource('// note\n"use client";')).toBe(true);
    expect(isClientSource('import x from "y";\n"use client";')).toBe(false);
    expect(isComponentName("LocationFields")).toBe(true);
    expect(isComponentName("locationValueFrom")).toBe(false);
    expect(isComponentName("EMPTY_LOCATION")).toBe(false);
    const imports = valueImports(
      'import { locationValueFrom, LocationFields, type LocationValue } from "@/a";\n' +
        'import type { X } from "@/b";\nimport Card, { cardHelper as helper } from "./c";\n' +
        'export { EMPTY_LOCATION } from "@/d";\nimport * as all from "@/e";',
    );
    expect(imports.map((item) => `${item.specifier}:${item.name}`)).toEqual([
      "@/a:locationValueFrom",
      "@/a:LocationFields",
      "./c:Card",
      "./c:cardHelper",
      "@/d:EMPTY_LOCATION",
      "@/e:*",
    ]);
  });

  it("has no violations in src", () => {
    const files = walk(SRC);
    const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
    const violations: string[] = [];
    for (const [file, source] of sources) {
      if (isClientSource(source)) continue;
      for (const { name, specifier } of valueImports(source)) {
        const target = resolveModule(file, specifier);
        if (!target || !isClientSource(sources.get(target) ?? readFileSync(target, "utf8"))) continue;
        if (isComponentName(name)) continue;
        violations.push(`${path.relative(ROOT, file)} uses ${name} from client module ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
