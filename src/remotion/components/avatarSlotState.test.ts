/**
 * src/remotion/components/avatarSlotState.test.ts
 *
 * Feature: invite-product-quality
 *
 * Property 10: Empty slot for Standard tier (Req 3.4) — for any slot, when no
 * avatar URL is supplied the compositing component produces no rendered output
 * for that slot (no placeholder graphic, partial pixels, or residual overlay).
 *
 * Plus the load-failure fallback (Req 3.7): a slot whose avatar URL fails to
 * load is rendered background-only and the failure is recorded, identifying the
 * affected slot.
 *
 * These assertions exercise the PURE render-decision helpers that drive
 * `AvatarSlot`'s early `return null`, so the behaviour is verified without a DOM
 * or a full Remotion render: `AvatarSlot` renders content iff
 * `shouldRenderAvatar(...)` is true.
 *
 * **Validates: Requirements 3.4, 3.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  shouldRenderAvatar,
  describeAvatarLoadFailure,
  type SlotCoords,
} from "./avatarSlotState";

// Arbitrary slot covering the reference-canvas coordinate space (and beyond).
const slotArb: fc.Arbitrary<SlotCoords> = fc.record({
  x: fc.double({ min: -2000, max: 4000, noNaN: true }),
  y: fc.double({ min: -2000, max: 4000, noNaN: true }),
  width: fc.double({ min: 0, max: 4000, noNaN: true }),
  height: fc.double({ min: 0, max: 4000, noNaN: true }),
  anchorBottom: fc.boolean(),
});

// A non-empty avatar URL.
const avatarUrlArb: fc.Arbitrary<string> = fc
  .webUrl()
  .filter((u) => u.length > 0);

describe("AvatarSlot render decision (Property 10: Empty slot for Standard tier)", () => {
  it("renders nothing for any slot when no avatar URL is supplied (Req 3.4)", () => {
    fc.assert(
      fc.property(slotArb, fc.boolean(), (_slot, loadFailed) => {
        // No avatar URL → never renders content, regardless of load state.
        expect(shouldRenderAvatar(undefined, loadFailed)).toBe(false);
        expect(shouldRenderAvatar("", loadFailed)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("renders the avatar when a URL is present and it has not failed to load", () => {
    fc.assert(
      fc.property(avatarUrlArb, (url) => {
        expect(shouldRenderAvatar(url, false)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

describe("AvatarSlot load-failure fallback (Req 3.7)", () => {
  it("renders background-only after an avatar URL fails to load", () => {
    fc.assert(
      fc.property(avatarUrlArb, (url) => {
        // A loaded-then-failed avatar must fall back to background-only.
        expect(shouldRenderAvatar(url, true)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("records the load failure identifying the affected slot", () => {
    fc.assert(
      fc.property(slotArb, avatarUrlArb, (slot, url) => {
        const failure = describeAvatarLoadFailure(slot, url);
        // The record identifies the affected slot...
        expect(failure.slot).toEqual(slot);
        // ...and the URL that failed.
        expect(failure.avatarUrl).toBe(url);
      }),
      { numRuns: 200 },
    );
  });

  it("does not retain a reference to the caller's slot object (defensive copy)", () => {
    const slot: SlotCoords = { x: 10, y: 20, width: 30, height: 40 };
    const failure = describeAvatarLoadFailure(slot, "https://cdn.example.com/a.png");
    expect(failure.slot).toEqual(slot);
    expect(failure.slot).not.toBe(slot);
  });
});
