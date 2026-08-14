/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import KnowledgeOptionSelect from "./KnowledgeOptionSelect";

afterEach(cleanup);

describe("KnowledgeOptionSelect", () => {
  it("uses the global content dropdown and preserves selection behavior", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <KnowledgeOptionSelect
        onChange={onChange}
        options={[
          { label: "Clinical evidence", value: "evidence" },
          { label: "Policy library", value: "policy" },
        ]}
        value="evidence"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Clinical evidence" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");

    await user.click(trigger);

    const listbox = screen.getByRole("listbox", { name: "Knowledge options" });
    expect(listbox).toHaveClass("global-content-dropdown");
    expect(
      within(listbox).getByRole("option", { name: "Clinical evidence" }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(
      within(listbox).getByRole("option", { name: "Policy library" }),
    );

    expect(onChange).toHaveBeenCalledWith("policy");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
