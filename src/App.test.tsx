import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Delphi living thesis workspace", () => {
  it("opens on thesis state and promotes counter-evidence", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Thesis Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /chat/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/new counter-evidence item/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("heading", { name: "Evidence Inbox" })).toBeInTheDocument();
    expect(screen.getByText(/custom accelerator access/)).toBeInTheDocument();
  });

  it("shows citation or uncertainty before inbox actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Evidence Inbox/ }));

    expect(screen.getByText("Cloud buyer call")).toBeInTheDocument();
    expect(screen.getAllByText("uncertain - no firm source").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Correct classification" }).length).toBeGreaterThan(0);
  });

  it("refreshes financial data into reviewable evidence candidates", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Evidence Inbox/ }));
    await user.click(screen.getByRole("button", { name: "Refresh financial data" }));

    expect(await screen.findByText(/financial data candidates added/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross margin crossed gross margin above 70%/)).toBeInTheDocument();
    expect(screen.getAllByText("Company fundamentals feed").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Correct classification" }).length).toBeGreaterThan(0);
  });

  it("records correction source as user", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Evidence Inbox/ }));
    const firstCorrect = screen.getAllByRole("button", { name: "Correct classification" })[0];
    await user.click(firstCorrect);
    await user.type(screen.getByLabelText("Note"), "Confirmed after reading the source.");
    await user.click(screen.getByRole("button", { name: "Save correction" }));

    expect(screen.getByText("You confirmed")).toBeInTheDocument();
  });

  it("rejects decision saves without human rationale", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Asset \/ Thesis/ }));
    await user.click(screen.getByRole("button", { name: "Record decision" }));
    const modal = screen.getByRole("dialog", { name: /Record decision/ });
    await user.click(within(modal).getByRole("button", { name: "Record decision" }));

    expect(screen.getByText(/will not record a decision without a human rationale/)).toBeInTheDocument();
  });

  it("keeps What Changed grounded and avoids fabricated stale changes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /What Changed/ }));

    expect(screen.getByText(/No material new evidence in 38 days/)).toBeInTheDocument();
    expect(screen.getByText("no new evidence")).toBeInTheDocument();
    expect(screen.getAllByText(/prompt only - no automatic conviction change/).length).toBeGreaterThan(0);
  });

  it("renders loading, error, empty, partial, and stale states", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByLabelText("View state");
    await user.selectOptions(screen.getByLabelText("View state"), "loading");
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("View state"), "error");
    expect(screen.getByText("Couldn't load your theses")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("View state"), "empty");
    expect(screen.getByText("No theses yet")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("View state"), "normal");
    expect(screen.getByText("No thesis yet")).toBeInTheDocument();
    expect(screen.getByText(/Stale - review overdue/)).toBeInTheDocument();
  });
});
