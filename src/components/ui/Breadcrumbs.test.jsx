/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Breadcrumbs from "./Breadcrumbs";

const trail = [
  { href: "#/dashboard", label: "Dashboard" },
  { href: "#/dashboard/reports", label: "Reports" },
  { href: "#/dashboard/reports/social", label: "Social" },
  { href: "#/dashboard/reports/social/audience", label: "Audience" },
  { href: "#/dashboard/reports/social/audience/weekly", label: "Weekly" },
  { label: "Export" },
];

afterEach(() => {
  cleanup();
});

describe("Breadcrumbs", () => {
  it.each([
    [2, ["Dashboard", "Export"]],
    [3, ["Dashboard", "Reports", "Export"]],
    [4, ["Dashboard", "Reports", "Social", "Export"]],
  ])("renders an accessible %i-item trail", (length, labels) => {
    render(<Breadcrumbs items={trail.slice(0, length - 1).concat(trail.at(-1))} />);

    const navigation = screen.getByRole("navigation", {
      name: "Breadcrumb",
    });
    const renderedTrailLabels = Array.from(
      navigation.querySelectorAll(
        ".breadcrumbs__item > a:not([role='menuitem']), .breadcrumbs__current",
      ),
    ).map((element) => element.textContent);

    expect(navigation.querySelector("ol")).toBeInTheDocument();
    expect(renderedTrailLabels).toEqual(labels);
    expect(within(navigation).getByText("Export")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("collapses a six-item desktop trail and reveals hidden ancestors", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { container } = render(
      <Breadcrumbs
        items={trail}
        maxVisibleItems={4}
        onNavigate={onNavigate}
      />,
    );
    const desktopEllipsis = container.querySelector(
      ".breadcrumbs__desktop-ellipsis",
    );
    const button = within(desktopEllipsis).getByRole("button", {
      name: "Show hidden breadcrumb items",
    });

    await user.click(button);

    const menu = screen.getByRole("menu", {
      name: "Hidden breadcrumb items",
    });
    expect(menu).toHaveClass("global-content-dropdown");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getByRole("menuitem", { name: "Reports" })).toBeEnabled();
    expect(within(menu).getByRole("menuitem", { name: "Social" })).toBeEnabled();

    await user.click(within(menu).getByRole("menuitem", { name: "Reports" }));

    expect(onNavigate).toHaveBeenCalledWith(trail[1]);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on hover and restores ellipsis focus after Escape", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Breadcrumbs items={trail} maxVisibleItems={4} />,
    );
    const desktopEllipsis = container.querySelector(
      ".breadcrumbs__desktop-ellipsis",
    );
    const button = within(desktopEllipsis).getByRole("button", {
      name: "Show hidden breadcrumb items",
    });

    await user.hover(desktopEllipsis);
    expect(button).toHaveAttribute("aria-expanded", "true");

    button.focus();
    await user.keyboard("{Escape}");

    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("renders breadcrumb entries without hrefs as non-interactive labels", async () => {
    const user = userEvent.setup();
    const items = [
      { href: "#/dashboard", label: "Dashboard" },
      { label: "Core Modules" },
      { label: "Patient" },
      { label: "Patient Dashboard" },
    ];
    const { container } = render(
      <Breadcrumbs items={items} maxVisibleItems={3} />,
    );
    const desktopEllipsis = container.querySelector(
      ".breadcrumbs__desktop-ellipsis",
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "#/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Patient" })).not.toBeInTheDocument();

    await user.click(
      within(desktopEllipsis).getByRole("button", {
        name: "Show hidden breadcrumb items",
      }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Core Modules" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
