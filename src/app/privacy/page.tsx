import Link from "next/link";
import { PageShell } from "@/components/ui";
import { PRIVACY_POLICY_UPDATED } from "@/features/privacy/policy-version";
import { ROUTES } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <article className="flex flex-col gap-5 text-base leading-relaxed text-neutral-800">
        <header className="flex flex-col gap-1 text-sm text-neutral-600">
          <p>
            <span className="font-medium text-neutral-900">Last updated:</span>{" "}
            {PRIVACY_POLICY_UPDATED}
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
            optional free text and the optional city where you worked that you
            enter for co-ops and internships. Your profile includes where you want
            to work: a home city (any US city or town) and how far you would go, or
            that you are open to anywhere, and whether you are open to remote work.
            It can also include notes and, if you choose, up to 3 things that
            matter most to you in a co-op. If you join through another student&apos;s
            invite link, we store who invited you. Every account has an invite code
            that appears in that link instead of an internal id. When someone you
            invited finishes onboarding, we record 100 points for you, for up to 10
            friends. Points can be spent on things coming soon. Our sign-in provider processes
            the information needed to authenticate you, including a password if
            you set one. We also store when you consent to the Privacy Policy,
            to storing your data, and to including reviews in anonymous company
            pages. If you use the career map, we store the careers you mark
            Interested or Not interested, the one you choose as your direction,
            and your answers to its short preference questions. If you use
            Community, we store the posts and answers you write, comments you
            leave on shared review notes, which work-style card you share (if
            you share it), any company,
            role or career area you tag them with, the posts and answers you mark
            Helpful, the reports you send, when you agreed to the Community rules,
            and hourly counts used to limit posting. If you ask for advisor access, we store
            the name you give, your school (from your sign-in email) and the
            founders&apos; decision. If you use Action,
            we store your plan&apos;s career goal, the tasks you add or accept,
            optional weekly-hours and horizon settings, and how you rate progress
            on listed skills. Action data is private to you as the student. Authorized
            administrators who operate Swervly and the necessary service providers
            that host and run the app may process it to provide the service. It is
            not shared publicly or with other students. You can export or delete it
            with your account.
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
            shows how many students and their average rating. If you picked
            what matters most to you in a co-op, each suggestion can also show the
            average rating for that from at least 2 different students in majors
            like yours who shared their reviews (pay needs at least 3, and is shown
            as a range). Swervly does not
            send your text to an AI model. The quiz uses lightly reworded
            Mini-IPIP items, so its scores do not carry the validation evidence of
            the original instrument, and they are not a clinical or hiring
            assessment.
            The career map uses your major, your Direction results and your own
            career map choices to order what you see first. It never shows a fit
            score, and you can change or clear those choices at any time.
            Company lists show organizations headquartered within your chosen
            distance of your home city first, with a line saying so. Nothing is
            hidden, and a headquarters is not always where co-ops are. City
            locations come from U.S. Census Bureau public data.
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
            the quiz and rule-based Direction. The page shows what percent of
            students would go back (each student counts once, by their latest co-op
            there), with Maybe shown separately and the number of students, plus
            average ratings, top skills, and shared notes. It does not show
            names. When fewer than 2 students in a major have shared reviews of a
            company, students in that major instead see an average across all
            majors: ratings, would go back and top skills only, never pay or
            written notes, and only once at least 2 different students
            contribute. A short version of these figures also appears on each
            company in Companies &amp; opportunities. Pay is shown only as the lowest and highest figures, and only when
            at least 3 different students in that group reported pay. A written note appears only if you ticked
            the share box for that note. The box is off until you type something. A
            threshold of two is a minimum, not a guarantee of anonymity: with
            only two students, each one may be able to work out what the other
            wrote, especially in a small major or unusual role. If you agreed to
            sharing before November 21, 2026, when the all-majors average was
            added, your reviews stop being shared until you turn sharing on again
            in Settings.
          </p>
          <p>
            Your home city, distance and the city where you worked are not shown
            to other students.
          </p>
          <p>
            Your invite code, who invited you, and your points are shown to you.
            Other students do not see your points or who you invited. The founders
            can see these records because they operate the service.
          </p>
          <p>
            Community posts and answers are shown to other signed-in students
            right away, without your name. The founders can see who wrote them.
            Helpful counts are shown; who marked them is not. Reports go only to
            the founders, who can hide, restore or remove reported posts. Hidden
            posts disappear for everyone except the founders.
          </p>
          <p>
            If you share your work-style card, other students see its name and
            description and the line you add, without your name. Your quiz
            answers and trait readings are not shared.
          </p>
          <p>
            Approved co-op and career advisors at your school see totals for
            students who signed up with your school&apos;s email domains: how
            many finished onboarding, took the quiz and logged a co-op review,
            and the most common chosen directions and companies reviewed. These
            never show names, and anything from fewer than 2 students is hidden.
            Advisors can list their students&apos; emails; Swervly keeps only a
            keyed hash of each address, never the address, and never tells an
            advisor whether an address has an account. Their roster totals count
            only students who chose to share their details with their
            school&apos;s advisors.
          </p>
          <p>
            Advisors see your own details only if you turn on sharing with your
            school&apos;s advisors in Settings, and only while you&apos;re on their
            roster. Settings lists exactly what they see: your email, major,
            year and goal; your work-style card; your chosen direction; your
            co-op history; and your review ratings with any notes you already
            chose to share. They never see your pay or notes you kept private.
            Every time an advisor opens your details, Settings shows their name,
            the date and what they saw. You can stop sharing at any time and it
            takes effect right away.
          </p>
          <p>
            Comments on a shared review note follow the same rules. They are
            shown, without your name, only to students who can see that note:
            students in the note writer&apos;s major, once the company page for that
            major is shown. If the writer stops sharing, the note and its
            comments are no longer shown.
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
            your account by typing DELETE. The download includes the Community
            posts and answers you wrote, your invite code, and your points.
            Deletion removes your profile, quiz answers, co-ops and internships,
            reviews, points, and Community answers, Helpful marks and reports from
            the application database, and deletes your sign-in account. Your
            Community posts are deleted too, except a post other students answered:
            its text and tags are erased and it is no longer linked to you, so
            their answers stay. If a friend you invited deletes their account,
            points you already earned stay, and they are no longer linked to that
            friend. If the student who invited you deletes their account, your
            account is no longer linked to them.
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
            We may update this policy as Swervly changes. When a change affects
            what we collect, who can see it or how it is used, we ask you to agree
            again before you keep using Swervly. Questions and privacy
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
