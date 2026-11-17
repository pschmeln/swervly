"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, Checkbox, ErrorNote, Field, TextInput } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { InviteLink } from "./invite-link";
import { SetPasswordForm } from "./set-password-form";
import { readApiResponse } from "./api";

const CONFIRM = "DELETE";

export function SettingsForm({
  passwordAlreadySet,
  shareFreeTextDefault,
  shareReviewsConsent,
  inviteHref,
  inviteCount,
  founder,
}: {
  passwordAlreadySet: boolean;
  shareFreeTextDefault: boolean;
  shareReviewsConsent: boolean;
  inviteHref: string;
  inviteCount: number;
  founder: boolean;
}) {
  const { signOut } = useClerk();
  const downloadRef = useRef(false);
  const deleteRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [shareDefault, setShareDefault] = useState(shareFreeTextDefault);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareReviews, setShareReviews] = useState(shareReviewsConsent);
  const [shareReviewsError, setShareReviewsError] = useState<string | null>(null);

  async function download() {
    if (downloadRef.current) return;
    downloadRef.current = true;
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(ROUTES.accountExport, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        let message = "Something went wrong.";
        try {
          const parsed = readApiResponse<unknown>(await response.json());
          if (parsed && !parsed.ok) message = parsed.error.message;
        } catch {
          message = "Something went wrong.";
        }
        setDownloadError(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "swervly-my-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("Something went wrong.");
    } finally {
      downloadRef.current = false;
      setDownloading(false);
    }
  }

  async function deleteAccount() {
    if (deleteRef.current || confirm.trim() !== CONFIRM) return;
    deleteRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(ROUTES.account, {
        method: "DELETE",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM }),
        cache: "no-store",
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const parsed = readApiResponse<unknown>(payload);
      if (!response.ok || !parsed || !parsed.ok) {
        const message =
          parsed && !parsed.ok
            ? (parsed.error.fields?.confirm ?? parsed.error.message)
            : "Something went wrong.";
        setDeleteError(message);
        deleteRef.current = false;
        setDeleting(false);
        return;
      }
      await signOut({ redirectUrl: ROUTES.landing });
    } catch {
      setDeleteError("Something went wrong.");
      deleteRef.current = false;
      setDeleting(false);
    }
  }

  async function saveShareDefault(next: boolean) {
    setShareDefault(next);
    setShareError(null);
    const response = await fetch(ROUTES.preferences, {
      method: "PUT",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ shareFreeTextDefault: next }),
    });
    const payload = await response.json().catch(() => null);
    const parsed = readApiResponse<unknown>(payload);
    if (!response.ok || !parsed?.ok) {
      setShareDefault(!next);
      setShareError(parsed && !parsed.ok ? parsed.error.message : "Something went wrong.");
    }
  }

  async function saveShareReviews(next: boolean) {
    setShareReviews(next);
    setShareReviewsError(null);
    const response = await fetch(ROUTES.preferences, {
      method: "PUT",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        shareFreeTextDefault: shareDefault,
        shareReviewsConsent: next,
      }),
    });
    const payload = await response.json().catch(() => null);
    const parsed = readApiResponse<unknown>(payload);
    if (!response.ok || !parsed?.ok) {
      setShareReviews(!next);
      setShareReviewsError(parsed && !parsed.ok ? parsed.error.message : "Something went wrong.");
    }
  }

  return (
    <div className="grid gap-4">
      <SetPasswordForm alreadySet={passwordAlreadySet} />
      <Card>
        <h2 className="text-lg font-semibold">Anonymous company pages</h2>
        <p className="mt-1 text-neutral-700">
          When this is on, your reviews can count toward anonymous company pages and Direction for
          other signed-in students. Pages stay hidden until at least 3 different students in a major
          contribute. Turn it off to keep your reviews private.
        </p>
        <div className="mt-4">
          <Checkbox
            id="shareReviewsConsent"
            label="Include my co-op reviews in anonymous company pages and Direction"
            checked={shareReviews}
            onChange={(event) => void saveShareReviews(event.target.checked)}
          />
        </div>
        {shareReviewsError ? (
          <div className="mt-3">
            <ErrorNote>{shareReviewsError}</ErrorNote>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Sharing notes</h2>
        <p className="mt-1 text-neutral-700">
          This is the starting choice for a new review. The box stays off until you type a note,
          and an empty note is never shared.
        </p>
        <div className="mt-4">
          <Checkbox
            id="shareFreeTextDefault"
            label="Start with sharing turned on when I write a note"
            checked={shareDefault}
            onChange={(event) => void saveShareDefault(event.target.checked)}
          />
        </div>
        {shareError ? (
          <div className="mt-3">
            <ErrorNote>{shareError}</ErrorNote>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Invite a classmate</h2>
        <p className="mt-1 text-neutral-700">
          Anyone with a .edu email can join. We count who arrives through your link.
        </p>
        <div className="mt-4">
          <InviteLink href={inviteHref} count={inviteCount} />
        </div>
      </Card>
      {founder ? (
        <Card>
          <h2 className="text-lg font-semibold">Founder queue</h2>
          <p className="mt-1 text-neutral-700">Approve companies and skills students added.</p>
          <div className="mt-4">
            <Link
              href={ROUTES.founders}
              className="inline-flex min-h-12 items-center font-medium underline"
            >
              Open the review queue
            </Link>
          </div>
        </Card>
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">Download my data</h2>
        <p className="mt-1 text-neutral-700">
          Download a JSON file of your account, profile, quiz answers, and co-ops.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading ? "Downloading…" : "Download my data"}
          </Button>
        </div>
        {downloadError ? (
          <div className="mt-3">
            <ErrorNote>{downloadError}</ErrorNote>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Delete my account</h2>
        <p id="delete-account-explanation" className="mt-1 text-neutral-700">
          Deleting your account removes your profile, quiz answers, co-ops and internships, and reviews.
          Your sign-in is removed as well. This cannot be undone.
        </p>
        <form
          className="mt-4 grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void deleteAccount();
          }}
        >
          <Field
            label="Type DELETE to confirm"
            htmlFor="confirmDelete"
            error={deleteError ?? undefined}
          >
            <TextInput
              id="confirmDelete"
              name="confirmDelete"
              value={confirm}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="DELETE"
              aria-describedby="delete-account-explanation"
              disabled={deleting}
              onChange={(event) => {
                setConfirm(event.target.value);
                setDeleteError(null);
              }}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={deleting || confirm.trim() !== CONFIRM}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
