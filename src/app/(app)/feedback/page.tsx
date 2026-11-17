import { PageShell } from "@/components/ui";
import { FeedbackForm } from "@/features/profile/components/feedback-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Feedback" };

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;
  const raw = params.page;
  const page = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 200) || "/feedback";

  return (
    <PageShell title="Feedback">
      <p className="text-neutral-700">A short note is enough. This note stays private.</p>
      <FeedbackForm page={page} />
    </PageShell>
  );
}
