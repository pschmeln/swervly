import { Suspense } from "react";
import { Card } from "@/components/ui";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="sky-page flex flex-1 items-start justify-center px-4 pb-10 pt-12 sm:pt-20">
      <Card className="w-full max-w-md">
        <Suspense fallback={<p className="text-ink-2">Loading sign-up…</p>}>
          <SignUpForm />
        </Suspense>
      </Card>
    </main>
  );
}
