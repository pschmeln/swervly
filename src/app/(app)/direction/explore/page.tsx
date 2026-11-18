import { Button, Card, PageShell } from "@/components/ui";
import { CareerExplore } from "@/features/explore/career-explore";
import { prototypeModel } from "@/features/explore/view-model";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Career exploration" };

/**
 * Prototype only. Production /direction is unchanged and does not link here.
 * The route stays behind the same sign-in gate as the rest of the app.
 */
export default async function CareerExplorePage() {
  await requireOnboardedUser();
  const model = prototypeModel();
  if (!model) {
    return (
      <PageShell title="Career exploration">
        <Card>
          <p className="text-neutral-800">This prototype is turned off.</p>
          <div className="mt-4">
            <Button href={ROUTES.direction} variant="secondary" className="w-full sm:w-auto">
              Back to Direction
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Career exploration">
      <CareerExplore model={model} phase="ready" />
    </PageShell>
  );
}
