import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SynthexImportPanel } from "../SynthexImportPanel";
import { acceptedBundle } from "@/lib/synthex/__tests__/import-fixture";

const fetchMock = vi.fn();
const response = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe("SynthexImportPanel public operator flow", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads local targets on demand, previews before explicit save, and shows sources and evidence separately", async () => {
    const onImported = vi.fn();
    fetchMock
      .mockReturnValueOnce(
        response({
          projects: [{ name: "synthex", repository: "CleanExpo/Synthex" }],
        }),
      )
      .mockReturnValueOnce(
        response({
          preview: {
            proposal: acceptedBundle().proposal,
            packetId: acceptedBundle().packetId,
            revision: 2,
            project: { name: "synthex", repository: "CleanExpo/Synthex" },
            executionBlocked: true,
          },
        }),
      )
      .mockReturnValueOnce(
        response({
          opportunity: {
            id: "import-1",
            name: "Operator captured proposal",
            stage: "blocked_review",
            status: "blocked_review",
          },
        }),
      );
    render(<SynthexImportPanel onImported={onImported} />);
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Import Synthex proposal" }),
    );
    await screen.findByRole("option", { name: /CleanExpo\/Synthex/ });
    expect(
      screen.queryByRole("button", { name: "Save blocked review" }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Target repository"),
      "CleanExpo/Synthex",
    );
    await userEvent.click(screen.getByLabelText("Synthex export JSON"));
    await userEvent.paste(JSON.stringify(acceptedBundle()));
    await userEvent.click(
      screen.getByRole("button", { name: "Preview import" }),
    );
    expect(
      await screen.findByText("Operator captured proposal"),
    ).toBeInTheDocument();
    const preview = within(screen.getByLabelText("Import preview"));
    expect(
      preview.getByText(/A creator reports a problem/),
    ).toBeInTheDocument();
    expect(
      preview.getByText(/An operator observed a manual handoff/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Demand and revenue remain unvalidated/),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onImported).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Save blocked review" }),
    );
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith(
        expect.objectContaining({ id: "import-1" }),
      ),
    );
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      previewOnly: false,
      targetRepository: "CleanExpo/Synthex",
    });
    expect(
      await screen.findByText(/Saved as blocked review/),
    ).toBeInTheDocument();
  });

  it("invalidates the preview whenever JSON or selected target changes", async () => {
    fetchMock
      .mockReturnValueOnce(
        response({
          projects: [{ name: "synthex", repository: "CleanExpo/Synthex" }],
        }),
      )
      .mockReturnValueOnce(
        response({
          preview: {
            proposal: acceptedBundle().proposal,
            packetId: acceptedBundle().packetId,
            revision: 2,
            project: { name: "synthex", repository: "CleanExpo/Synthex" },
            executionBlocked: true,
          },
        }),
      );
    render(<SynthexImportPanel onImported={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Import Synthex proposal" }),
    );
    await screen.findByRole("option", { name: /CleanExpo\/Synthex/ });
    await userEvent.selectOptions(
      screen.getByLabelText("Target repository"),
      "CleanExpo/Synthex",
    );
    await userEvent.click(screen.getByLabelText("Synthex export JSON"));
    await userEvent.paste(JSON.stringify(acceptedBundle()));
    await userEvent.click(
      screen.getByRole("button", { name: "Preview import" }),
    );
    await screen.findByRole("button", { name: "Save blocked review" });
    await userEvent.type(screen.getByLabelText("Synthex export JSON"), " ");
    expect(
      screen.queryByRole("button", { name: "Save blocked review" }),
    ).not.toBeInTheDocument();
  });

  it("shows failed registry loading with a retry and malformed input without saving", async () => {
    fetchMock
      .mockReturnValueOnce(response({ error: "Registry unavailable" }, false))
      .mockReturnValueOnce(
        response({
          projects: [{ name: "synthex", repository: "CleanExpo/Synthex" }],
        }),
      );
    render(<SynthexImportPanel onImported={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Import Synthex proposal" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Registry unavailable",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Retry projects" }),
    );
    await screen.findByRole("option", { name: /CleanExpo\/Synthex/ });
    await userEvent.selectOptions(
      screen.getByLabelText("Target repository"),
      "CleanExpo/Synthex",
    );
    await userEvent.type(
      screen.getByLabelText("Synthex export JSON"),
      "invalid",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Preview import" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter valid export JSON",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
