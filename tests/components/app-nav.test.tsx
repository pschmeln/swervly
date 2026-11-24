import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/direction/atlas" }));

import { AppNav, isActive, NAV } from "@/components/app-nav";

describe("AppNav", () => {
  it("shows only the core journey plus Settings", () => {
    expect(NAV.map((item) => item.label)).toEqual(["Home", "Self", "Explore", "My plan", "Settings"]);
  });

  it("keeps Reviews, Community and Companies out of the top nav (they are contextual)", () => {
    const hrefs: string[] = NAV.map((item) => item.href);
    expect(hrefs).not.toContain("/reviews");
    expect(hrefs).not.toContain("/community");
    expect(hrefs.some((href) => href.startsWith("/companies"))).toBe(false);
    expect(hrefs).toContain("/settings");
  });

  it("marks a section active on its own page and on pages under it", () => {
    expect(isActive("/reviews", "/reviews")).toBe(true);
    expect(isActive("/reviews/new", "/reviews")).toBe(true);
    expect(isActive("/reviewsx", "/reviews")).toBe(false);
    expect(isActive("/home", "/reviews")).toBe(false);
  });

  it("marks only the current section with aria-current and renders the account slot", () => {
    const html = renderToStaticMarkup(<AppNav account={<span>ACCOUNT</span>} />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    // The Career map lives under Explore.
    expect(html).toMatch(/aria-current="page"[^>]*>Explore</);
    expect(html).toContain("ACCOUNT");
    // The phone menu starts closed.
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('id="main-menu"');
  });

  it("uses the official on-light wordmark and links home to /home", () => {
    const html = renderToStaticMarkup(<AppNav account={<span>ACCOUNT</span>} />);
    expect(html).toContain("/brand/wordmark-on-light.svg");
    expect(html).toContain('aria-label="Swervly home"');
    expect(html).toContain('href="/home"');
    expect(html).not.toContain("bg-gradient-to-br");
    expect(html).not.toContain("wordmark-light.svg");
  });
});
