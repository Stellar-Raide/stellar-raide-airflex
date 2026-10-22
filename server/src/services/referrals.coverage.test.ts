import { createReferralCode, validateReferralApplication } from "./referrals";

describe("referral code safety", () => {
  it("never emits ambiguous characters", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(createReferralCode()).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
    }
  });

  it("is deterministic for a supplied entropy source", () => {
    expect(createReferralCode((size) => Buffer.alloc(size, 0))).toBe("AAAAAAAAAAAAAAAA");
  });

  it("rejects self referral and expired codes", () => {
    expect(() => validateReferralApplication("u1", "u1")).toThrow("cannot refer");
    expect(() => validateReferralApplication("u1", "u2", new Date(0))).toThrow("expired");
    expect(() => validateReferralApplication("u1", "u2")).not.toThrow();
  });
});
