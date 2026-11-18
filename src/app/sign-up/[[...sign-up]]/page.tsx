import { Suspense } from "react";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Suspense fallback={<p className="text-neutral-700">Loading sign-up…</p>}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
