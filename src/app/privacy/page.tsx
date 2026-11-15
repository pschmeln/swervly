import { PageShell } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <article className="flex flex-col gap-5 text-base leading-relaxed text-neutral-800">
        <header className="flex flex-col gap-1 text-sm text-neutral-600">
          <p>
            <span className="font-medium text-neutral-900">Last updated:</span>{" "}
            November 15, 2026
          </p>
          <p>
            <span className="font-medium text-neutral-900">Contact:</span>{" "}
            <a
              className="underline underline-offset-2 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              href="mailto:support@swervly.com"
            >
              support@swervly.com
            </a>
          </p>
        </header>

        <p>
          Swervly is an early-stage career exploration and co-op reflection
          service for University of Cincinnati (UC) students. Swervly is{" "}
          <strong className="font-semibold text-neutral-900">
            not affiliated with or endorsed by the University of Cincinnati
          </strong>
          .
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Information we collect
          </h2>
          <p>
            When you sign in and use Swervly, we collect your UC email address;
            major, year, and optional co-op track; career goals and location
            preferences or constraints; your answers to the 30-item career
            interest questionnaire and its calculated scores; and the co-op
            experiences you choose to enter. Co-op records can include employer,
            role, term, rotation number, whether you received a return offer,
            four experience ratings, skills used, optional hourly pay, and
            optional written comments. Our sign-in provider also processes
            information needed to authenticate you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Why we use it
          </h2>
          <p>
            We use this information to create your personal profile, let you
            save and review your co-op experiences, operate and secure the
            service, and, if you agree to data use, help develop future
            aggregated insights and career recommendations for UC students.{" "}
            <strong className="font-semibold text-neutral-900">
              The current early version does not show your reviews to other
              students or use AI to process your free-text reviews.
            </strong>
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Who can see it
          </h2>
          <p>
            Today, your profile and co-op reviews are visible in the app only to
            you. The two Swervly founders can access records through
            administrative database access to operate, troubleshoot, and secure
            the service. Service providers used for authentication, hosting, and
            database storage process information as needed to deliver Swervly.
            We do not currently publish individual co-op records to other
            students.
          </p>
          <p>
            In a future version, we plan to show UC students de-identified
            review information{" "}
            <strong className="font-semibold text-neutral-900">
              without student names
            </strong>
            . We intend to show pay only as a{" "}
            <strong className="font-semibold text-neutral-900">
              range based on three or more records
            </strong>
            , never as an individual&apos;s pay. Written comments will be shared
            only if you separately turn on the optional sharing checkbox for
            that comment; it is off by default. We will not release small groups
            or combinations of details that could reasonably identify a student.
            These future sharing features are{" "}
            <strong className="font-semibold text-neutral-900">
              not active today
            </strong>
            , and we will update this policy and review consent before
            activating them.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Your choices and controls
          </h2>
          <p>
            You choose whether to provide pay and written comments. You can
            leave the written-comment sharing checkbox off. You can download a
            copy of your account data or request account deletion using the{" "}
            <strong className="font-semibold text-neutral-900">Settings</strong>{" "}
            page once these features have been verified as operational. Deleting
            an account is intended to remove its profile, assessments, co-op
            entries, and reviews from the application database, and to delete
            the linked sign-in account. Provider backups or legally required
            records may have separate retention periods; these must be confirmed
            before publication. If the Settings controls are unavailable,
            contact us at the address above.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Security and retention
          </h2>
          <p>
            We limit application access to eligible UC email accounts and use
            authentication and access checks to protect records. No internet
            service can promise perfect security. We keep account data while
            your account exists, subject to the final deletion and
            backup-retention practices we will confirm before launch.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Changes and questions
          </h2>
          <p>
            We may update this policy as Swervly develops. Material changes to
            how student records are shared will be disclosed before the relevant
            feature is enabled. Contact{" "}
            <a
              className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              href="mailto:support@swervly.com"
            >
              support@swervly.com
            </a>{" "}
            with questions or privacy requests.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
