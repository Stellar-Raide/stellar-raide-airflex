import { profileUpdateSchema, updateProfileSchema } from "./profile.schemas";

describe("profileUpdateSchema", () => {
  it("exports both profileUpdateSchema and updateProfileSchema as identical schemas", () => {
    expect(profileUpdateSchema).toBe(updateProfileSchema);
  });

  it("passes with valid single-field updates", () => {
    const validPayloads = [
      { alias: "crypto_trader" },
      { displayHandle: "@trader_99" },
      { displayHandle: "trader_99" },
      { notificationsEnabled: false },
      { optOutNotifications: true },
      { stellarPublicKey: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H" },
      { virtualAccountNumber: "0123456789" },
      { virtualBankName: "Wema Bank" },
    ];

    for (const payload of validPayloads) {
      const result = profileUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(payload);
      }
    }
  });

  it("passes with multiple valid fields combined", () => {
    const payload = {
      alias: "johndoe",
      displayHandle: "@johndoe",
      notificationsEnabled: true,
      stellarPublicKey: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      virtualAccountNumber: "1234567890",
      virtualBankName: "Access Bank",
    };

    const result = profileUpdateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("passes with an empty object (field count checked at handler level)", () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects unrecognized / unknown extra fields (.strict)", () => {
    const payload = {
      alias: "johndoe",
      injectedField: "malicious_payload",
      role: "admin",
    };

    const result = profileUpdateSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.code === "unrecognized_keys");
      expect(issue).toBeDefined();
      expect((issue as any)?.keys).toEqual(
        expect.arrayContaining(["injectedField", "role"])
      );
    }
  });

  it("rejects alias with invalid characters or length", () => {
    // Has spaces and special characters
    expect(profileUpdateSchema.safeParse({ alias: "not valid!" }).success).toBe(false);
    // Exceeds 32 chars
    expect(
      profileUpdateSchema.safeParse({
        alias: "a".repeat(33),
      }).success
    ).toBe(false);
    // Empty string
    expect(profileUpdateSchema.safeParse({ alias: "" }).success).toBe(false);
  });

  it("rejects invalid displayHandle format", () => {
    expect(
      profileUpdateSchema.safeParse({ displayHandle: "invalid handle!" }).success
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ displayHandle: "a".repeat(35) }).success
    ).toBe(false);
  });

  it("rejects non-boolean notificationsEnabled / optOutNotifications", () => {
    expect(
      profileUpdateSchema.safeParse({ notificationsEnabled: "true" as any }).success
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ optOutNotifications: 1 as any }).success
    ).toBe(false);
  });

  it("rejects malformed Stellar public key", () => {
    // Too short
    expect(profileUpdateSchema.safeParse({ stellarPublicKey: "GSHORT" }).success).toBe(false);
    // Does not start with G
    expect(
      profileUpdateSchema.safeParse({
        stellarPublicKey: "SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      }).success
    ).toBe(false);
    // Contains invalid characters
    expect(
      profileUpdateSchema.safeParse({
        stellarPublicKey: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC70X2H", // 0 is invalid in Crockford base32
      }).success
    ).toBe(false);
  });

  it("rejects invalid virtualAccountNumber format", () => {
    // Not 10 digits
    expect(
      profileUpdateSchema.safeParse({ virtualAccountNumber: "12345" }).success
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ virtualAccountNumber: "12345678901" }).success
    ).toBe(false);
    // Non-digits
    expect(
      profileUpdateSchema.safeParse({ virtualAccountNumber: "abcdefghij" }).success
    ).toBe(false);
  });
});
