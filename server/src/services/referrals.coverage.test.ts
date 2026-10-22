import { createReferralCode } from "./referrals";

describe("referral code safety", () => {
  it("never emits ambiguous characters", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(createReferralCode()).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
    }
  });

  it("is deterministic for a supplied entropy source", () => {
    expect(createReferralCode((size) => Buffer.alloc(size, 0))).toBe("AAAAAAAAAAAAAAAA");
  });
});
