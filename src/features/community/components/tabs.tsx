import Link from "next/link";
import { focusRing } from "@/components/ui/focus-ring";
import { ROUTES } from "@/lib/constants";

export type CommunityTab = "posts" | "companies";

export function CommunityTabs({ active }: { active: CommunityTab }) {
  const tabs: { id: CommunityTab; label: string; href: string }[] = [
    { id: "posts", label: "Posts", href: ROUTES.community },
    { id: "companies", label: "Companies", href: `${ROUTES.community}?tab=companies` },
  ];
  return (
    <nav aria-label="Community sections" className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
          className={`inline-flex min-h-12 items-center rounded-full px-5 text-base font-semibold ${tab.id === active ? "bg-ink text-white" : "border border-neutral-200 bg-white text-ink"} ${focusRing}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
