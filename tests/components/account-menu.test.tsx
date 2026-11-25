import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Render Clerk's menu parts as plain markup so the custom link can be checked.
vi.mock("@clerk/nextjs", () => {
  function MenuItems({ children }: { children?: ReactNode }) {
    return <ul>{children}</ul>;
  }
  function Link({ label, href, labelIcon }: { label: string; href: string; labelIcon: ReactNode }) {
    return (
      <li>
        <a href={href}>
          {labelIcon}
          {label}
        </a>
      </li>
    );
  }
  function UserButton({ children }: { children?: ReactNode }) {
    return <div data-user-button="">{children}</div>;
  }
  return { UserButton: Object.assign(UserButton, { MenuItems, Link }) };
});

import { AccountMenu, USER_PROFILE_APPEARANCE } from "@/components/account-menu";

describe("AccountMenu", () => {
  it("puts a Settings link to /settings in the account menu", () => {
    const html = renderToStaticMarkup(<AccountMenu />);
    expect(html).toContain("data-user-button");
    expect(html).toMatch(/<a href="\/settings">.*Settings<\/a>/);
  });

  it("hides Clerk's own Delete account, so deletion always goes through Settings", () => {
    expect(USER_PROFILE_APPEARANCE.elements.profileSection__danger).toEqual({ display: "none" });
  });
});
