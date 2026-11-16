import Link from "next/link";
import { PageShell } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <article className="flex flex-col gap-5 text-base leading-relaxed text-neutral-800">
        <header className="flex flex-col gap-1 text-sm text-neutral-600">
          <p>
            <span className="font-medium text-neutral-900">Last updated:</span>{" "}
            November 16, 2026
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
          Swervly is a career exploration and co-op reflection service built for
          University of Cincinnati (UC) students and open to anyone with a
          university email. Swervly is{" "}
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
            When you sign in and use Swervly, we collect your university email,
            the school you report, your major, and your year; your goals; your
            interest answers; and the employers, ratings, optional pay, and
            optional free text you enter for co-ops and internships. A record
            can also include role, term, a number from 1 to 5 for that co-op or
            internship, whether you received a return offer, and skills used.
            Your profile can include an optional co-op track, location
            preferences or constraints, and notes. We store the scores
            calculated from your interest answers. Our sign-in provider processes
            the information needed to authenticate you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Why we use it
          </h2>
          <p>
            We use this information to create your profile, let you save and
            review your co-op experiences, and operate and secure the service.
            During onboarding you agree that your answers and co-op reviews may
            in future be used, without your name, for aggregated ratings and
            recommendations for students. That is not active today. We will
            update this policy and ask you again before turning it on. Swervly
            does not show your reviews to other students,
            and it does not use AI to process your free text.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Who can see it
          </h2>
          <p>
            Today, only you can see your profile and co-op reviews in the app.
            The two Swervly founders can also see those records because they
            have database access to operate the service. The sign-in, hosting,
            and database services that run Swervly process this information to
            provide the service. We do not show your reviews to other students.
          </p>
          <p>
            In a future version, we plan to show other students de-identified
            review information{" "}
            <strong className="font-semibold text-neutral-900">
              without student names
            </strong>
            . We intend to show pay only as a{" "}
            <strong className="font-semibold text-neutral-900">
              range based on three or more records
            </strong>
            , never as an individual&apos;s pay. Written comments will be shared
            only if you turn on the optional sharing checkbox for that comment;
            it is off by default. We will not release small groups or
            combinations of details that could reasonably identify a student.
            These sharing features are{" "}
            <strong className="font-semibold text-neutral-900">
              not available today
            </strong>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Your choices and controls
          </h2>
          <p>
            You choose whether to provide pay and free text. You can leave the
            free-text sharing checkbox off. On the{" "}
            <Link
              className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              href={ROUTES.settings}
            >
              Settings
            </Link>{" "}
            page you can download a JSON file of your account, profile, interest
            answers, and co-ops, including employers, ratings, optional pay, and
            optional free text. On that page you can delete your account by
            typing DELETE. Deletion removes your profile, interest answers,
            co-ops and internships, and reviews from the application database, and
            deletes your sign-in account.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Security and retention
          </h2>
          <p>
            We limit application access to university email accounts that end in
            .edu, and we use authentication and access checks to protect records.
            No internet service can promise perfect security. We keep your account data
            while your account exists. When you delete your account, that data
            is removed from the application database as described above.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Changes and questions
          </h2>
          <p>
            We may update this policy as Swervly changes. Questions and privacy
            requests go to{" "}
            <a
              className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              href="mailto:support@swervly.com"
            >
              support@swervly.com
            </a>
            .
          </p>
        </section>
      </article>
    </PageShell>
  );
}
