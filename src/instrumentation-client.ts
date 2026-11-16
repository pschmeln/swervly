import * as Sentry from "@sentry/nextjs";
import { sentrySharedOptions } from "@/lib/sentry";

Sentry.init({
  ...sentrySharedOptions(),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
