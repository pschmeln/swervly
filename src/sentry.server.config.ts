import * as Sentry from "@sentry/nextjs";
import { sentrySharedOptions } from "@/lib/sentry";

Sentry.init({
  ...sentrySharedOptions(),
  includeLocalVariables: false,
});
