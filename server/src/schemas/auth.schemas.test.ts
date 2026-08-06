/**
 * auth.schemas.test.ts
 *
 * Unit tests for requestOtpSchema and verifyOtpSchema.
 */

import { requestOtpSchema, verifyOtpSchema } from "./auth.schemas";

// ---------------------------------------------------------------------------
// requestOtpSchema
// ---------------------------------------------------------------------------

describe("requestOtpSchema", () => {
  it("accepts an international E.164 number", () => {
    expect(requestOtpSchema.safeParse({ phone: "+2348012345678" }).success).toBe(true);
  });

  it("accepts a Nigerian local number (0XXXXXXXXXX)", () => {
    expect(requestOtpSchema.safeParse({ phone: "08012345678" }).success).toBe(true);
  });

  it("trims leading and trailing whitespace", () => {
    const result = requestOtpSchema.safeParse({ phone: "  +2348012345678  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+2348012345678");
    }
  });

  it("rejects an empty string", () => {
    expect(requestOtpSchema.safeParse({ phone: "" }).success).toBe(false);
  });

  it("rejects a phone number that is too short (fewer than 10 digits)", () => {
    expect(requestOtpSchema.safeParse({ phone: "12345" }).success).toBe(false);
  });

  it("rejects a phone number that is too long (more than 15 digits)", () => {
    expect(requestOtpSchema.safeParse({ phone: "1234567890123456" }).success).toBe(false);
  });

  it("rejects a number starting with 0 after the +", () => {
    // +0... violates E.164 (country codes don't start with 0)
    expect(requestOtpSchema.safeParse({ phone: "+0234812345678" }).success).toBe(false);
  });

  it("rejects alphabetic input", () => {
    expect(requestOtpSchema.safeParse({ phone: "notaphone" }).success).toBe(false);
  });

  it("rejects a missing phone field", () => {
    const result = requestOtpSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path[0]).toBe("phone");
    }
  });
});

// ---------------------------------------------------------------------------
// verifyOtpSchema
// ---------------------------------------------------------------------------

describe("verifyOtpSchema", () => {
  const valid = { phone: "+2348012345678", otp: "123456" };

  it("accepts a valid phone and 6-digit OTP", () => {
    expect(verifyOtpSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace from both fields", () => {
    const result = verifyOtpSchema.safeParse({
      phone: "  +2348012345678  ",
      otp: "  123456  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+2348012345678");
      expect(result.data.otp).toBe("123456");
    }
  });

  it("rejects an OTP shorter than 6 digits", () => {
    const result = verifyOtpSchema.safeParse({ ...valid, otp: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path[0]).toBe("otp");
    }
  });

  it("rejects an OTP longer than 6 digits", () => {
    const result = verifyOtpSchema.safeParse({ ...valid, otp: "1234567" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path[0]).toBe("otp");
    }
  });

  it("rejects a non-numeric OTP", () => {
    const result = verifyOtpSchema.safeParse({ ...valid, otp: "abc123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path[0]).toBe("otp");
    }
  });

  it("rejects an empty OTP", () => {
    const result = verifyOtpSchema.safeParse({ ...valid, otp: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing phone field", () => {
    const result = verifyOtpSchema.safeParse({ otp: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("phone");
    }
  });

  it("rejects a missing otp field", () => {
    const result = verifyOtpSchema.safeParse({ phone: "+2348012345678" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("otp");
    }
  });
});
