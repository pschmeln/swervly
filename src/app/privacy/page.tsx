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
            November 18, 2026
          </p>
          <p>
            <span className="font-medium text-neutral-900">Contact:</span>{" "}
            <a
              className="underline underline-offset-2 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href="mailto:support@swervly.com"
            >
              support@swervly.com
            </a>
          </p>
        </header>

        <p>
          Swervly is a career exploration and co-op reflection service for
          students with an email address that ends in .edu. Swervly is{" "}
          <strong className="font-semibold text-neutral-900">
            not affiliated with or endorsed by any university
          </strong>
          .
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Information we collect
          </h2>
          <p>
            When you sign in and use Swervly, we collect your school email, the
            school domain from that email, the school name you type, your major,
            and your year; your goals; your personality quiz answers and the five
            scores we calculate from them; and the employers, role type, role
            title, term, ratings, whether you would go back, optional pay, skills,
            and optional free text you enter for co-ops and internships. Your
            profile can include an optional co-op track, location preferences or
            constraints, and notes. If you join through another student&apos;s
            invite link, we store that connection. Our sign-in provider processes
            the information needed to authenticate you, including a password if
            you set one. We also store when you consent to the Privacy Policy,
            to storing your data, and to including reviews in anonymous company
            pages. If you use the career map, we store the careers you mark
            Interested or Not interested, the one you choose as your direction,
            and your answers to its short preference questions.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Why we use it
          </h2>
          <p>
            We use this information to create your profile, let you save co-op
            reviews, show other signed-in students an anonymous company view when
            you have agreed to share, and offer Direction: role types matched to
            how you work. Direction starts from a written rules table that
            connects quiz answers and majors to roles. When at least 2 different
            students with nearby quiz profiles have reviewed a role, that role
            shows how many students and their average rating. Swervly does not
            send your text to an AI model. The quiz uses lightly reworded
            Mini-IPIP items, so its scores do not carry the validation evidence of
            the original instrument, and they are not a clinical or hiring
            assessment.
            The career map uses your major, your Direction results and your own
            career map choices to order what you see first. It never shows a fit
            score, and you can change or clear those choices at any time.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Who can see it
          </h2>
          <p>
            You can see your own profile, quiz result, and reviews. Other
            signed-in students can see a company page for your major only when you
            have turned on sharing for reviews. That section stays hidden until at
            least 2 different students in the major have authorized reviews for
            the company, so one student with several reviews cannot unlock it
            alone. Sharing is optional; you can keep reviews private and still use
            the quiz and rule-based Direction. The page shows how many co-op
            experiences were rated &quot;Would go back&quot; (counting Yes only, with
            Maybe shown separately), with a separate count of reviews and students,
            plus average ratings, top skills, and shared notes. It does not show
            names. Pay is shown only as a range, and only when 2 different students
            in that group reported pay. A written note appears only if you ticked
            the share box for that note. The box is off until you type something. A
            threshold of two is a minimum, not a guarantee of anonymity: with
            only two students, each one may be able to work out what the other
            wrote, especially in a small major or unusual role. If you agreed to
            sharing before November 18, 2026, when the minimum was three, your
            reviews stop being shared until you turn sharing on again in Settings.
          </p>
          <p>
            The two Swervly founders can see records because they operate the
            service and approve new companies and skills in a review queue. A
            company or skill you add stays private to you until a founder
            approves it. The sign-in, hosting, and database services that run
            Swervly process this information to provide the service.
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
              className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href={ROUTES.settings}
            >
              Settings
            </Link>{" "}
            page you can turn anonymous company-page sharing on or off, choose the
            default for sharing a note, download a JSON file of your account,
            profile, quiz answers, and co-ops (including employers, ratings,
            optional pay, and optional free text), copy an invite link, and delete
            your account by typing DELETE. Deletion removes your profile, quiz
            answers, co-ops and internships, and reviews from the application
            database, and deletes your sign-in account.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Security and retention
          </h2>
          <p>
            We limit application access to email accounts whose domain ends in
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
              className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
