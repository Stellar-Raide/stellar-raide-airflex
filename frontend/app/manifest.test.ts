/**
 * PWA manifest screenshots (issue #293).
 *
 * Chrome's Android install sheet only shows previews when the manifest has a
 * `screenshots` array whose entries are tagged with a `form_factor`, so the
 * assertions below pin both the metadata and the actual files on disk — a
 * manifest pointing at a missing or wrong-sized image silently degrades to
 * the minimal install banner.
 */

import fs from "fs";
import path from "path";

import manifest from "./manifest";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Reads the width/height out of a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file);
  // 8-byte signature, then a length (4) + "IHDR" (4), then width/height.
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("manifest screenshots", () => {
  const screenshots = manifest().screenshots ?? [];

  it("declares at least two screenshots", () => {
    expect(screenshots.length).toBeGreaterThanOrEqual(2);
  });

  it("tags every screenshot as a narrow (mobile) viewport", () => {
    for (const shot of screenshots) {
      expect(shot).toMatchObject({ form_factor: "narrow" });
    }
  });

  it("describes each screenshot as a portrait mobile image", () => {
    for (const shot of screenshots) {
      expect(shot.type).toBe("image/png");
      expect(shot.sizes).toBe("1080x1920");
      expect(shot.src).toMatch(/^\/screenshots\/.+\.png$/);
    }
  });

  it.each((manifest().screenshots ?? []).map((s) => [s.src, s] as const))(
    "%s exists on disk at the declared size",
    (src, shot) => {
      const file = path.join(PUBLIC_DIR, src.replace(/^\//, ""));
      expect(fs.existsSync(file)).toBe(true);

      const { width, height } = pngSize(file);
      const [w, h] = (shot.sizes ?? "").split("x").map(Number);
      expect({ width, height }).toEqual({ width: w, height: h });
    }
  );
});

/**
 * PWA manifest icons, theme and display (issue #462).
 *
 * Lighthouse's "installable-icon" check requires a 192px (or larger) icon
 * with a `maskable` purpose, plus a matching `theme_color`. These assertions
 * pin both the manifest metadata and the underlying PNG files so a missing or
 * wrong-sized icon is caught before it silently degrades the install prompt.
 */
describe("manifest icons and theme (#462)", () => {
  const m = manifest();
  const icons = m.icons ?? [];

  it("declares 192x192 and 512x512 icons", () => {
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("includes a maskable purpose at both 192x192 and 512x512", () => {
    const maskable192 = icons.find(
      (i) => i.sizes === "192x192" && i.purpose?.includes("maskable"),
    );
    const maskable512 = icons.find(
      (i) => i.sizes === "512x512" && i.purpose?.includes("maskable"),
    );
    expect(maskable192).toBeDefined();
    expect(maskable512).toBeDefined();
  });

  it("every icon file exists on disk as a valid PNG", () => {
    for (const icon of icons) {
      const file = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ""));
      expect(fs.existsSync(file)).toBe(true);

      const { width, height } = pngSize(file);
      const [w, h] = (icon.sizes ?? "").split("x").map(Number);
      expect({ width, height }).toEqual({ width: w, height: h });
    }
  });

  it("sets theme_color and background_color matching the brand palette", () => {
    expect(m.theme_color).toBe("#7c3aed");
    expect(m.background_color).toBe("#f9fafb");
  });

  it('uses display "standalone" with a meaningful name and short_name', () => {
    expect(m.display).toBe("standalone");
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.name!.length).toBeGreaterThan(0);
    expect(m.short_name!.length).toBeGreaterThan(0);
  });
});
