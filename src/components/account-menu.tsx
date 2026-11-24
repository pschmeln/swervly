"use client";

import { UserButton } from "@clerk/nextjs";
import { ROUTES } from "@/lib/constants";

/**
 * The account button in the top nav. Settings (privacy, sharing, export, delete, referral
 * link) lives in this menu rather than the main nav, which shows only the core journey.
 * Clerk's own "Manage account" and "Sign out" stay below it.
 */
export function AccountMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Settings" labelIcon={<GearIcon />} href={ROUTES.settings} />
      </UserButton.MenuItems>
    </UserButton>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}
