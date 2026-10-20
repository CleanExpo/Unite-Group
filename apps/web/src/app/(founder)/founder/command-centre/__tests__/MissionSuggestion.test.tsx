import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MissionSuggestion,
  MissionSuggestionContext,
  missionSuggestion,
} from "../MissionSuggestion";
import { createIdeaLifecycle } from "@/lib/command-centre/idea-lifecycle";
import { mandateDomains } from "../MissionResearch";

const state = () =>
  createIdeaLifecycle(
    {
      title: "Visual skills deck",
      rawIdea: "Research and plan only. No build dispatch or deployment.",
      requestId: "00000000-0000-4000-8000-000000000001",
    },
    {
      actorId: "00000000-0000-4000-8000-000000000002",
      now: "2026-10-20T00:00:00Z",
    },
  );

describe("mission draft suggestions", () => {
  it("Tab accepts local text once, keeps it editable, and never submits the form", () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <MissionSuggestion
          label="Research objective"
          name="objective"
          suggestion="Review the existing skills deck"
          multiline
        />
        <button>Save</button>
      </form>,
    );
    const field = screen.getByRole("textbox", { name: "Research objective" });
    expect(field).toHaveValue("");
    const first = fireEvent.keyDown(field, { key: "Tab" });
    expect(first).toBe(false);
    expect(field).toHaveValue("Review the existing skills deck");
    expect(fireEvent.keyDown(field, { key: "Tab" })).toBe(true);
    fireEvent.change(field, { target: { value: "My revised scope" } });
    expect(field).toHaveValue("My revised scope");
    expect(submit).not.toHaveBeenCalled();
  });

  it("accept and edit selects the inserted draft without saving", async () => {
    render(
      <MissionSuggestion
        label="Next action"
        name="nextStep"
        suggestion="Review findings"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Accept and edit suggestion for Next action",
      }),
    );
    const field = screen.getByRole("textbox", {
      name: "Next action",
    }) as HTMLInputElement;
    await waitFor(() => {
      expect(field.selectionStart).toBe(0);
      expect(field.selectionEnd).toBe("Review findings".length);
    });
    expect(field).toHaveFocus();
  });

  it("supports Escape, Shift-Tab, IME and custom text without replacing it", () => {
    render(
      <MissionSuggestion
        label="Plan"
        name="design"
        suggestion="A proposed journey"
      />,
    );
    const field = screen.getByRole("textbox", { name: "Plan" });
    expect(fireEvent.keyDown(field, { key: "Tab", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(field, { key: "Tab", isComposing: true })).toBe(
      true,
    );
    fireEvent.keyDown(field, { key: "Escape" });
    expect(
      screen.queryByRole("button", { name: "Accept suggestion for Plan" }),
    ).not.toBeInTheDocument();
    expect(fireEvent.keyDown(field, { key: "Tab" })).toBe(true);
    fireEvent.change(field, { target: { value: "Custom journey" } });
    expect(field).toHaveValue("Custom journey");
  });

  it("preserves existing values and read-only values; disabled fields cannot accept", () => {
    render(
      <>
        <MissionSuggestion
          label="Saved"
          name="objective"
          defaultValue="Saved scope"
          suggestion="Replacement"
        />
        <MissionSuggestion
          label="Read only"
          name="design"
          readOnly
          suggestion="Never insert"
        />
        <fieldset disabled>
          <MissionSuggestion
            label="Disabled"
            name="nextStep"
            suggestion="Never insert"
          />
        </fieldset>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Saved" })).toHaveValue(
      "Saved scope",
    );
    expect(
      screen.queryByRole("button", { name: "Accept suggestion for Saved" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept suggestion for Read only" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Disabled" }), {
      key: "Tab",
    });
    expect(screen.getByRole("textbox", { name: "Disabled" })).toHaveValue("");
  });

  it("grounds drafts in this mission and never invents evidence or payment authority", () => {
    const lifecycle = state();
    render(
      <MissionSuggestionContext.Provider value={lifecycle}>
        <MissionSuggestion
          label="Research objective"
          name="objective"
          multiline
        />
      </MissionSuggestionContext.Provider>,
    );
    expect(screen.getByText(/Research Visual skills deck:/)).toHaveTextContent(
      "No build dispatch or deployment.",
    );
    expect(
      missionSuggestion(
        lifecycle,
        "outputContent0",
        "Understanding: finding or reason",
      ),
    ).toContain("Research still needed");
    for (const name of [
      "stripeAccountId",
      "productId",
      "activationEvent",
      "reference",
      "statement",
      "annotation",
      "requiredClients",
      "minimumNet",
      "windowStart",
    ])
      expect(missionSuggestion(lifecycle, name, name)).toBeUndefined();
    expect(
      missionSuggestion(lifecycle, "summary", "Findings so far"),
    ).toContain("do not establish research completion");
    expect(
      mandateDomains([
        "Founder notes",
        "https://docs.example.com/guide",
        "https://docs.example.com/other",
        "http://other.example.com",
        "https://user:pass@example.com",
      ]),
    ).toBe("docs.example.com");
  });
});
