export function founderEmailsFrom(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.includes("@") && !item.includes(" ")),
  );
}

export function isFounderEmail(email: string, raw = process.env.FOUNDER_EMAILS): boolean {
  return founderEmailsFrom(raw).has(email.trim().toLowerCase());
}
