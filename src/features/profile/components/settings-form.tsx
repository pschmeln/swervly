"use client";

import { useRef, useState } from "react";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiResponse } from "./api";

const CONFIRM = "DELETE";

export function SettingsForm() {
  const downloadRef = useRef(false);
  const deleteRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      window.location.assign(ROUTES.landing);
    } catch {
      setDeleteError("Something went wrong.");
      deleteRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Download my data</h2>
        <p className="mt-1 text-neutral-700">
          Download a JSON file of your account, profile, interest answers, and co-ops.
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
          Deleting your account removes your profile, interest answers, co-op rotations, and reviews.
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
