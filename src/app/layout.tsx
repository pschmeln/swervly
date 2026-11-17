import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { FeedbackLink } from "@/components/feedback-link";
import { ROUTES } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swervly",
  description:
    "Most students pick co-ops with almost no information about what they'll actually enjoy. Swervly turns a short quiz and real reviews into a direction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider>
          <div className="flex min-h-full flex-1 flex-col">
            <div className="flex-1">{children}</div>
            <footer className="mx-auto w-full max-w-3xl px-4 py-4">
              <Suspense
                fallback={
                  <a
                    href={ROUTES.feedback}
                    className="inline-flex min-h-12 items-center text-base font-medium underline underline-offset-2"
                  >
                    Feedback
                  </a>
                }
              >
                <FeedbackLink />
              </Suspense>
            </footer>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
