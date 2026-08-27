/**
 * generate-openapi.ts
 *
 * Writes the OpenAPI document to openapi.json at the server root.
 * Run via: npx ts-node scripts/generate-openapi.ts
 *
 * Used by CI to regenerate and diff the committed spec:
 *   npx ts-node scripts/generate-openapi.ts && git diff --exit-code openapi.json
 */

import fs from "fs";
import path from "path";
import { openApiDocument } from "../src/openapi";

const outPath = path.resolve(__dirname, "..", "openapi.json");
fs.writeFileSync(outPath, JSON.stringify(openApiDocument, null, 2) + "\n", "utf8");
console.log(`OpenAPI spec written to ${outPath}`);
