// src/app/admin/avatar-review.smoke.test.ts
//
// Smoke test for the admin avatar-review UI (Req 2.5).
//
// The admin page is a large client component whose data arrives via runtime
// fetch; a full DOM render would require a browser-like environment and a long-
// running harness. Per the lightweight directive, this smoke test instead
// inspects the rendered review markup statically and asserts the structural
// guarantee that matters for Req 2.5: each generated Avatar_Asset is presented
// ALONGSIDE the Reference_Photo set within a single side-by-side review block.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const adminSource = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
);

/** Extract the avatar-review block: from its container marker to the approve action. */
function reviewBlock(source: string): string {
  const start = source.indexOf('data-testid="avatar-review"');
  const end = source.indexOf('data-testid="avatar-approve"');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("admin avatar-review UI (smoke, Req 2.5)", () => {
  it("renders a dedicated avatar review block", () => {
    expect(adminSource).toContain('data-testid="avatar-review"');
  });

  it("presents each avatar asset alongside the reference photo set in the same block", () => {
    const block = reviewBlock(adminSource);

    // The reference photo set is rendered from the order's uploaded photos.
    expect(block).toContain('data-testid="reference-photos"');
    expect(block).toContain('data-testid="reference-photo"');
    expect(block).toContain("order.photos.map");

    // Each generated avatar asset is rendered from the QA sub-state assets.
    expect(block).toContain('data-testid="avatar-asset"');
    expect(block).toContain('data-testid="avatar-asset-image"');
    expect(block).toContain("order.avatarQa.assets.map");
  });

  it("wires approve and reject actions to the QA service", () => {
    expect(adminSource).toContain('data-testid="avatar-approve"');
    expect(adminSource).toContain('data-testid="avatar-reject"');
    expect(adminSource).toContain('reviewAvatars(order.id, "approve")');
    expect(adminSource).toContain('reviewAvatars(order.id, "reject")');
    // The action handler calls the avatar QA endpoint.
    expect(adminSource).toContain('fetch("/api/avatar-qa"');
  });
});
