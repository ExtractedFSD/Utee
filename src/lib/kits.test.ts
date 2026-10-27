import { describe, expect, it } from "vitest";
import { isClaimable } from "./kits";

describe("isClaimable", () => {
  it("lets shop stock be claimed by the first scan", () => {
    expect(isClaimable({ status: "printed", customer_id: null })).toBe(true);
  });

  it("never lets a kit that someone owns be claimed", () => {
    expect(isClaimable({ status: "printed", customer_id: "u1" })).toBe(false);
    expect(isClaimable({ status: "delivered", customer_id: "u1", released_at: "2026-10-27T10:00:00Z" })).toBe(false);
  });

  it("lets a kit the buyer released be claimed while it is still unused", () => {
    for (const status of ["assigned", "shipped", "delivered"]) {
      expect(isClaimable({ status, customer_id: null, released_at: "2026-10-27T10:00:00Z" })).toBe(true);
    }
  });

  it("does not let an ownerless kit be claimed once it has been used", () => {
    for (const status of ["activated", "received_by_lab", "report_ready", "closed"]) {
      expect(isClaimable({ status, customer_id: null, released_at: "2026-10-27T10:00:00Z" })).toBe(false);
    }
  });

  it("does not treat an unreleased online kit that lost its owner as claimable", () => {
    expect(isClaimable({ status: "delivered", customer_id: null })).toBe(false);
    expect(isClaimable(null)).toBe(false);
  });
});
