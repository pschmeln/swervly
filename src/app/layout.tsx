import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { Suspense } from "react";
import { FeedbackLink } from "@/components/feedback-link";
import { ROUTES } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Page titles only. Regular and italic, as in mockup v3.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Swervly",
  description:
    "Most students pick co-ops with almost no information about what they'll actually enjoy. Swervly turns a short quiz and real reviews into a direction.",
  // App Router also serves src/app/icon.svg, src/app/favicon.ico, and
  // src/app/apple-icon.png. Explicit entries keep /favicon.ico and Apple touch
  // working for clients that do not pick up file conventions alone.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/brand/icon-blue.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider
          appearance={{
            // Match the Swervly look (mockup v3): ink buttons, Inter, rounded corners.
            variables: {
              colorPrimary: "#0b1220",
              colorPrimaryForeground: "#ffffff",
              colorForeground: "#0b1220",
              fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              borderRadius: "0.75rem",
            },
          }}
        >
          <div className="flex min-h-full flex-1 flex-col">
            <div className="flex-1">{children}</div>
            <footer className="mx-auto w-full max-w-5xl px-4 py-6">
              <Suspense
                fallback={
                  <a
                    href={ROUTES.feedback}
                    className="inline-flex min-h-12 items-center text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
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
