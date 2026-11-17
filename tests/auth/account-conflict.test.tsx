import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AccountConflictPage from "@/app/account-conflict/page";
import { EMAIL_CONFLICT_MESSAGE } from "@/lib/constants";
import { isPublicPath } from "@/proxy";

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => (
    <div data-sign-out="true">{children}</div>
  ),
}));

describe("account conflict page", () => {
  it("explains the other sign-in, offers sign-out, and shows support", () => {
    const html = renderToStaticMarkup(<AccountConflictPage />);
    expect(html).toContain(EMAIL_CONFLICT_MESSAGE);
    expect(html).toContain('data-sign-out="true"');
    expect(html).toContain("Sign out");
    expect(html).toContain('href="mailto:support@swervly.com"');
    expect(html).toContain("support@swervly.com");
    expect(html).not.toContain("User row missing after insert.");
  });

  it("stays off the public list so a signed-in session can open it", () => {
    expect(isPublicPath("/account-conflict")).toBe(false);
    expect(isPublicPath("/not-eligible")).toBe(true);
    expect(isPublicPath("/home")).toBe(false);
  });
});
