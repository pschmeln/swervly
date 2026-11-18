import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="sky-page flex flex-1 items-start justify-center px-4 pb-10 pt-12 sm:pt-20">
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}
