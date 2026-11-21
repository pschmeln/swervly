import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageShell } from "@/components/ui";
import { ActionDashboard } from "@/features/action-ui/dashboard";
import { filledDashboard, gapBundle, MOCK_PURSUING } from "@/features/action-ui/mock";
import { toDashboard } from "@/features/action-ui/adapter";
import { ACTION_UNAVAILABLE_MESSAGE, NO_PURSUING_MESSAGE, PROGRESS_COPY, READINESS_NOTE } from "@/features/action-ui/view";

const now = new Date("2026-11-18T15:00:00.000Z");

function page(node: ReactNode) {
  return renderToStaticMarkup(
    <PageShell title="Action" description="Turn your direction into a few steps you can edit." width="wide">
      {node}
    </PageShell>,
  );
}

function text(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe("Action dashboard", () => {
  it("renders the filled plan with the next steps, skill ratings, and week count", () => {
    const html = page(<ActionDashboard source="mock" initial={{ status: "ready", dashboard: filledDashboard(now) }} pursuing={null} now={now} />);
    const plain = text(html);
    expect(html).toContain("<h1");
    expect(plain).toContain("Action");
    expect(plain).toContain("Software Developers");
    expect(plain).toContain("Chosen here");
    expect(plain).toContain("Your next three steps");
    expect(plain).toContain("Mark done");
    expect(plain).toContain("Programming");
    expect(plain).toContain("Comfortable");
    expect(plain).toContain("Developing");
    expect(plain).toContain("Not yet assessed");
    expect(plain).toContain(PROGRESS_COPY.unrated);
    expect(plain).toContain(READINESS_NOTE);
    expect(plain).toContain("Practice");
    expect(plain).toContain("Prepare");
    expect(plain).toContain("Explore");
    expect(plain).toContain("Reflect");
    expect(plain).toContain("Your own steps");
    expect(plain).toContain("Shadow a developer for an hour");
    expect(plain).toContain("1 step finished this week.");
    expect(plain).toContain("5 hours a week set aside.");
    expect(plain).not.toMatch(/career ready/i);
    expect(plain).not.toMatch(/you lack/i);
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
    expect(html).toContain("Add a step");
    expect(html).toContain("Save settings");
    expect(html).toContain("Change goal");
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('for="');
    expect(html).not.toContain('role="status"');
  });

  it("shows an empty state when no career is selected", () => {
    const html = page(<ActionDashboard source="mock" initial={{ status: "empty" }} pursuing={null} />);
    const plain = text(html);
    expect(plain).toContain("Choose a career to work toward");
    expect(plain).toContain(NO_PURSUING_MESSAGE);
    expect(plain).toContain("Search careers");
    expect(plain).toContain("Open the career map");
    expect(plain).not.toContain("Start from this direction");
  });

  it("offers the saved Atlas direction without a node id on the button", () => {
    const html = page(<ActionDashboard source="mock" initial={{ status: "empty" }} pursuing={MOCK_PURSUING} />);
    const plain = text(html);
    expect(plain).toContain("Application development");
    expect(plain).toContain("Start from this direction");
    expect(html).not.toContain("spec:application-development");
  });

  it("shows the unavailable state and a load error with retry", () => {
    const unavailable = page(<ActionDashboard source="mock" initial={{ status: "unavailable" }} pursuing={null} />);
    expect(text(unavailable)).toContain(ACTION_UNAVAILABLE_MESSAGE);
    expect(unavailable).toContain('role="alert"');
    expect(text(unavailable)).toContain("Retry");

    const errored = page(<ActionDashboard source="mock" initial={{ status: "error", message: "Something went wrong." }} pursuing={null} />);
    expect(text(errored)).toContain("Something went wrong.");
    expect(errored).toContain('role="alert"');
    expect(text(errored)).toContain("Retry");
  });

  it("shows a save failure with retry and leaves the saved goal in place", () => {
    const html = page(
      <ActionDashboard
        source="mock"
        initial={{ status: "ready", dashboard: filledDashboard(now) }}
        pursuing={null}
        now={now}
        initialNotice={{ status: "error", message: "Could not save this task.", retry: { kind: "reload" } }}
      />,
    );
    const plain = text(html);
    expect(html).toContain('role="alert"');
    expect(plain).toContain("Could not save this task.");
    expect(plain).toContain("Retry");
    expect(plain).toContain("Software Developers");
    expect(plain).not.toContain("Saved.");
    expect(showsSaved(html)).toBe(false);
  });

  it("announces a successful save", () => {
    const html = page(
      <ActionDashboard
        source="mock"
        initial={{ status: "ready", dashboard: filledDashboard(now) }}
        pursuing={null}
        now={now}
        initialNotice={{ status: "saved" }}
      />,
    );
    expect(html).toContain('role="status"');
    expect(text(html)).toContain("Saved.");
    expect(html).not.toContain('role="alert"');
  });

  it("renders missing skill data as a note without a rating control", () => {
    const dashboard = toDashboard(gapBundle(now));
    expect(dashboard).not.toBeNull();
    const html = page(<ActionDashboard source="mock" initial={{ status: "ready", dashboard: dashboard! }} pursuing={null} now={now} />);
    const plain = text(html);
    expect(plain).toContain("missing data, not a claim that you lack skills");
    expect(html).not.toContain("Your rating for Skills not listed yet");
    expect(plain).toContain(PROGRESS_COPY.unrated);
  });
});

function showsSaved(html: string) {
  return html.includes('role="status"');
}
