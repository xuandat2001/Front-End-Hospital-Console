import fs from "node:fs";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync("src/styles/liquid-glass.css", "utf8");

function majorConsoleMaterialRule() {
  const start = css.indexOf("/* Major Console containers use the approved Overview-card material. */");
  const end = css.indexOf("/* Compact transient surfaces retain the material", start);
  return css.slice(start, end);
}

describe("liquid-glass transient surfaces", () => {
  it("does not force generic modal, panel, drawer, menu, popover, or flyout classes transparent", () => {
    const rule = majorConsoleMaterialRule();

    [
      '[class$="-modal"]',
      '[class*="-modal "]',
      '[class$="-panel"]',
      '[class*="-panel "]',
      '[class$="-drawer"]',
      '[class*="-drawer "]',
      '[class$="-menu"]',
      '[class*="-menu "]',
      '[class$="-popover"]',
      '[class*="-popover "]',
      '[class$="-flyout"]',
      '[class*="-flyout "]',
    ].forEach((selector) => {
      expect(rule).not.toContain(selector);
    });
  });

  it("defines near-opaque foreground rules for transient surfaces and inputs", () => {
    expect(css).toContain(".knowledge-upload-modal");
    expect(css).toContain(".document-modal-panel");
    expect(css).toContain(".diagnostics-panel");
    expect(css).toContain("rgba(250, 252, 255, 0.97)");
    expect(css).toContain("rgba(8, 13, 28, 0.98)");
    expect(css).toContain("rgba(15, 23, 42, 0.92)");
  });
});
