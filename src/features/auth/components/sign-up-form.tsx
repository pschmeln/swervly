"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";
import { PasswordInput } from "@/features/auth/components/password-input";
import { mapClerkFieldError, mapPasswordErrorCode, PASSWORD_HINT } from "@/features/auth/password-messages";
import {
  RESEND_COOLDOWN_MS,
  validateSignUpCredentials,
} from "@/features/auth/sign-up-validation";
import { ROUTES } from "@/lib/constants";

type LocalErrors = {
  email?: string;
  password?: string;
  confirm?: string;
  code?: string;
  form?: string;
};

function globalClerkMessage(
  errors: { global: Array<{ code: string; message: string; longMessage?: string }> | null },
): string | undefined {
  const first = errors.global?.[0];
  if (!first) return undefined;
  return mapPasswordErrorCode(first.code) ?? first.longMessage ?? first.message;
}

export function SignUpForm() {
  const { isSignedIn } = useAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [localErrors, setLocalErrors] = useState<LocalErrors>({});
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const pending = submitting || fetchStatus === "fetching";
  const awaitingVerification =
    !!signUp &&
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  useEffect(() => {
    if (isSignedIn || signUp?.status === "complete") {
      router.replace(ROUTES.home);
    }
  }, [isSignedIn, signUp?.status, router]);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSecondsLeft]);

  async function sendVerificationCode(): Promise<boolean> {
    if (!signUp) return false;
    if (resendSecondsLeft > 0) {
      setLocalErrors({
        form: `Wait ${resendSecondsLeft}s before requesting another code.`,
      });
      return false;
    }
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setLocalErrors({
        form:
          mapPasswordErrorCode(error.code) ??
          error.longMessage ??
          error.message ??
          "We could not send a verification code. Try again in a moment.",
      });
      return false;
    }
    setResendSecondsLeft(Math.ceil(RESEND_COOLDOWN_MS / 1000));
    return true;
  }

  async function onSubmitCredentials(event: React.FormEvent) {
    event.preventDefault();
    if (!signUp || pending) return;

    const validation = validateSignUpCredentials({ email, password, confirm });
    if (validation) {
      setLocalErrors(validation);
      return;
    }

    setSubmitting(true);
    setLocalErrors({});
    try {
      const { error } = await signUp.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const mapped = mapPasswordErrorCode(error.code);
        const message = mapped ?? error.longMessage ?? error.message;
        const isPasswordIssue = typeof error.code === "string" && error.code.includes("password");
        setLocalErrors({
          password: isPasswordIssue ? message : undefined,
          form: isPasswordIssue
            ? undefined
            : (message ?? "We could not start sign-up. Check your email and password."),
        });
        return;
      }
      await sendVerificationCode();
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!signUp || pending) return;
    if (code.trim().length === 0) {
      setLocalErrors({ code: "Enter the verification code from your email." });
      return;
    }

    setSubmitting(true);
    setLocalErrors({});
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (error) {
        setLocalErrors({
          code: error.longMessage ?? error.message ?? "That code did not work. Try again.",
        });
        return;
      }
      if (signUp.status === "complete") {
        const { error: finalizeError } = await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(ROUTES.home);
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
        if (finalizeError) {
          setLocalErrors({
            form:
              finalizeError.longMessage ??
              finalizeError.message ??
              "Verification worked, but we could not finish sign-up.",
          });
        }
      } else {
        setLocalErrors({
          form: "Verification succeeded, but sign-up is not complete yet. Try again or sign in.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (!signUp || pending) return;
    setSubmitting(true);
    setLocalErrors({});
    try {
      await sendVerificationCode();
    } finally {
      setSubmitting(false);
    }
  }

  if (isSignedIn || signUp?.status === "complete") {
    return <p className="text-neutral-700">Taking you to Swervly…</p>;
  }

  if (!signUp) {
    return <p className="text-neutral-700">Loading sign-up…</p>;
  }

  if (awaitingVerification) {
    const fieldCode = mapClerkFieldError(errors.fields.code);
    return (
      <form className="grid w-full max-w-md gap-4" onSubmit={(event) => void onVerify(event)}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
          <p className="mt-2 leading-7 text-neutral-700">
            Enter the code we sent. Creating a password does not remove future verification when Clerk
            asks for one.
          </p>
        </div>
        <Field label="Verification code" htmlFor="signUpCode" error={localErrors.code ?? fieldCode}>
          <TextInput
            id="signUpCode"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            disabled={pending}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        {localErrors.form ? <ErrorNote>{localErrors.form}</ErrorNote> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Verifying…" : "Verify and continue"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending || resendSecondsLeft > 0}
          onClick={() => void onResend()}
        >
          {resendSecondsLeft > 0 ? `Resend code in ${resendSecondsLeft}s` : "Resend code"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() => void signUp.reset()}
        >
          Start over
        </Button>
      </form>
    );
  }

  const emailFieldError = localErrors.email ?? mapClerkFieldError(errors.fields.emailAddress);
  const passwordFieldError = localErrors.password ?? mapClerkFieldError(errors.fields.password);
  const formError = localErrors.form ?? globalClerkMessage(errors);

  return (
    <form className="grid w-full max-w-md gap-4" onSubmit={(event) => void onSubmitCredentials(event)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 leading-7 text-neutral-700">
          Use a university email ending in .edu, choose a password, then verify your email.
        </p>
      </div>
      <Field label="University email" htmlFor="signUpEmail" error={emailFieldError}>
        <TextInput
          id="signUpEmail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={pending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="signUpPassword"
        hint={PASSWORD_HINT}
        error={passwordFieldError}
      >
        <PasswordInput
          id="signUpPassword"
          name="password"
          value={password}
          disabled={pending}
          onChange={setPassword}
        />
      </Field>
      <Field label="Confirm password" htmlFor="signUpConfirm" error={localErrors.confirm}>
        <PasswordInput
          id="signUpConfirm"
          name="confirmPassword"
          value={confirm}
          disabled={pending}
          onChange={setConfirm}
        />
      </Field>
      {formError && formError !== passwordFieldError && formError !== emailFieldError ? (
        <ErrorNote>{formError}</ErrorNote>
      ) : null}
      {/* Required when legacy bot protection is enabled in Clerk. */}
      <div id="clerk-captcha" />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Continuing…" : "Continue"}
      </Button>
      <p className="text-sm text-neutral-600">
        Already have an account?{" "}
        <a href={ROUTES.signIn} className="font-medium underline underline-offset-2">
          Sign in
        </a>
      </p>
    </form>
  );
}
